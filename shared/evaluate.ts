import xxhash from 'xxhash-wasm';

import { Attributes } from './attributes';
import { Timestamp } from './proto/google/protobuf/timestamp';
import {
  DateTimeOp_Operator,
  FeatureToggle,
  FeatureToggle_Type,
  FloatOp_Operator,
  IntOp_Operator,
  Key,
  Key_Type,
  Match,
  Stickiness_Type,
  StringOp_Operator
} from './proto/shared/feature_toggle';

export class FeatureToggleError extends Error {
  constructor(message?: string) {
    // 'Error' breaks prototype chain here
    super(message);

    // restore prototype chain
    const actualProto = new.target.prototype;
    Object.setPrototypeOf(this, actualProto);
  }
}

export const isOn = async (ft: FeatureToggle, attrs?: Attributes): Promise<boolean> => {
  if (!ft.enabled) {
    return false;
  }

  if (ft.deletedAt) {
    return false;
  }

  let isOn = false;
  switch (ft.toggleType) {
    // They're the same
    case FeatureToggle_Type.ON_OFF:
      if (ft.featureDefinition.oneofKind !== 'onOff' || !ft.featureDefinition.onOff) {
        throw new FeatureToggleError(`feature toggle ${ft.name} is invalid`);
      }
      const onOff = ft.featureDefinition.onOff;
      if (!onOff.on || !onOff.off) {
        throw new FeatureToggleError(`feature toggle ${ft.name} is invalid`);
      }

      const on = onOff.on;
      const off = onOff.off;
      if (
        (on!.weight !== 100 && on!.weight !== 0) ||
        (off!.weight !== 100 && off!.weight !== 0) ||
        on.weight + off.weight !== 100
      ) {
        throw new FeatureToggleError(`feature toggle ${ft.name} has invalid weights`);
      }

      isOn = on!.weight > 0;

      // Now process allow list followed by disallow list
      if (!isOn) {
        const matched = await match(ft.name, on!.matches, attrs);
        isOn = matched;
      }

      if (isOn) {
        const matched = await match(ft.name, off!.matches, attrs);
        // This is a disallow list. Hence, should be negated.
        isOn = !matched;
      }
      break;
    case FeatureToggle_Type.PERCENTAGE:
      if (ft.featureDefinition.oneofKind !== 'percentage' || !ft.featureDefinition.percentage) {
        throw new FeatureToggleError(`feature toggle ${ft.name} is invalid`);
      }

      const prcnt = ft.featureDefinition.percentage;
      if (!prcnt || !prcnt.on || !prcnt.off || !prcnt.stickiness) {
        throw new FeatureToggleError(`feature toggle ${ft.name} is invalid`);
      }
      const onWeight = prcnt.on!.weight;
      const offWeight = prcnt.off!.weight;
      const stickiness = prcnt.stickiness;
      if (onWeight + offWeight !== 100 || onWeight < 0 || offWeight < 0) {
        throw new FeatureToggleError(`invalid weights for feature toggle ${ft.name}`);
      }
      switch (stickiness.stickinessType) {
        case Stickiness_Type.RANDOM:
          isOn = Math.random() * 100 < onWeight;
          break;
        case Stickiness_Type.KEYS:
          const keyHash = await hash(ft.name, stickiness.keys, prcnt.salt, attrs);
          // Provides 0.000001 precision
          isOn = keyHash % BigInt(1000000) < BigInt(onWeight * 10000);
          break;
      }

      // Now process allow list followed by disallow list
      if (!isOn) {
        const matched = await match(ft.name, prcnt.on!.matches, attrs);
        isOn = matched;
      }

      if (isOn) {
        const matched = await match(ft.name, prcnt.off!.matches, attrs);
        // This is a disallow list. Hence, should be negated.
        isOn = !matched;
      }
      break;
  }

  return isOn;
};

export const match = async (name: string, matches: Match[], attrs?: Attributes) => {
  for (const match of matches) {
    if (!match.key || !match.key?.key) {
      throw new FeatureToggleError(`invalid match key for ${name}`);
    }

    if (match.key?.keyType === undefined) {
      throw new FeatureToggleError(`invalid match key type for ${name}`);
    }

    const key = match.key?.key!;
    let attr = attrs?.[key];
    if (attr === undefined) {
      continue;
    }

    switch (match.key?.keyType) {
      case Key_Type.BOOLEAN:
        if (typeof attr !== 'boolean') {
          throw new FeatureToggleError(
            `value passed for ${key} is not boolean for feature toggle ${name}`
          );
        }
        if (match.operation.oneofKind !== 'boolOp' || match.operation === undefined) {
          throw new FeatureToggleError(
            `no boolean operation set for ${key} and feature toggle ${name}`
          );
        }
        const boolVal = match.operation.boolOp.value;
        if (boolVal === attr) {
          return true;
        }
        break;
      case Key_Type.DATE_TIME:
        if (!(attr instanceof Date)) {
          throw new FeatureToggleError(
            `value passed for ${key} is not Date for feature toggle ${name}`
          );
        }
        if (match.operation.oneofKind !== 'dateTimeOp' || match.operation === undefined) {
          throw new FeatureToggleError(
            `no dateTime operation set for ${key} and feature toggle ${name}`
          );
        }
        const dateOp = match.operation.dateTimeOp;
        if (!attr || !dateOp.timestamp) {
          throw new FeatureToggleError(
            `expected a Date attribute for ${key} and feature toggle ${name}`
          );
        }
        const dateVal = Timestamp.toDate(dateOp.timestamp);
        switch (dateOp.op) {
          case DateTimeOp_Operator.AFTER:
            return attr.getTime() > dateVal.getTime();
          case DateTimeOp_Operator.BEFORE:
            return attr.getTime() < dateVal.getTime();
        }
      case Key_Type.FLOAT:
        if (typeof attr !== 'number') {
          throw new FeatureToggleError(
            `value passed for ${key} is not number for feature toggle ${name}`
          );
        }
        if (match.operation.oneofKind !== 'floatOp' || match.operation === undefined) {
          throw new FeatureToggleError(
            `no floatOp operation set for ${key} and feature toggle ${name}`
          );
        }
        const floatOp = match.operation.floatOp;
        if (!attr) {
          throw new FeatureToggleError(
            `expected a number attribute set for ${key} and feature toggle ${name}`
          );
        }
        if (floatOp.values.length < 1) {
          throw new FeatureToggleError(
            `expected values set in featureguards.com for ${key} and feature toggle ${name}`
          );
        }
        switch (floatOp.op) {
          case FloatOp_Operator.IN:
            return floatOp.values.includes(attr);
          default:
            if (floatOp.values.length !== 1) {
              throw new FeatureToggleError(
                `expected a single value in featureguards.com for ${key} and feature toggle ${name}`
              );
            }
            switch (floatOp.op) {
              case FloatOp_Operator.EQ:
                return attr === floatOp.values[0];
              case FloatOp_Operator.GT:
                return attr > floatOp.values[0];
              case FloatOp_Operator.GTE:
                return attr >= floatOp.values[0];
              case FloatOp_Operator.LT:
                return attr < floatOp.values[0];
              case FloatOp_Operator.LTE:
                return attr <= floatOp.values[0];
              case FloatOp_Operator.NEQ:
                return attr !== floatOp.values[0];
            }
        }
      case Key_Type.INT:
        if (typeof attr !== 'number' && typeof attr !== 'bigint') {
          throw new FeatureToggleError(
            `value passed for ${key} is not number|bigint for feature toggle ${name}`
          );
        }
        if (match.operation.oneofKind !== 'intOp' || match.operation === undefined) {
          throw new FeatureToggleError(
            `no intOp operation set for ${key} and feature toggle ${name}`
          );
        }
        const intOp = match.operation.intOp;
        if (!attr) {
          throw new FeatureToggleError(
            `expected a number|bigint attribute set for ${key} and feature toggle ${name}`
          );
        }
        if (intOp.values.length < 1) {
          throw new FeatureToggleError(
            `expected values set in featureguards.com for ${key} and feature toggle ${name}`
          );
        }
        const bigIntAttr = BigInt(attr);
        switch (intOp.op) {
          case IntOp_Operator.IN:
            return intOp.values.includes(bigIntAttr);
          default:
            if (intOp.values.length !== 1) {
              throw new FeatureToggleError(
                `expected a single value in featureguards.com for ${key} and feature toggle ${name}`
              );
            }
            switch (intOp.op) {
              case IntOp_Operator.EQ:
                return bigIntAttr === intOp.values[0];
              case IntOp_Operator.GT:
                return bigIntAttr > intOp.values[0];
              case IntOp_Operator.GTE:
                return bigIntAttr >= intOp.values[0];
              case IntOp_Operator.LT:
                return bigIntAttr < intOp.values[0];
              case IntOp_Operator.LTE:
                return bigIntAttr <= intOp.values[0];
              case IntOp_Operator.NEQ:
                return bigIntAttr !== intOp.values[0];
            }
        }
      case Key_Type.STRING:
        if (typeof attr !== 'string') {
          throw new FeatureToggleError(
            `value passed for ${key} is not string for feature toggle ${name}`
          );
        }
        if (match.operation.oneofKind !== 'stringOp' || match.operation === undefined) {
          throw new FeatureToggleError(
            `no stringOp operation set for ${key} and feature toggle ${name}`
          );
        }
        const stringOp = match.operation.stringOp;
        if (!attr || !stringOp.values.length) {
          throw new FeatureToggleError(
            `expected a string attribute for ${key} and feature toggle ${name}`
          );
        }
        switch (stringOp.op) {
          case StringOp_Operator.IN:
            return stringOp.values.includes(attr);
          default:
            if (stringOp.values.length !== 1) {
              throw new FeatureToggleError(
                `expected a single value in featureguards.com for ${key} and feature toggle ${name}`
              );
            }
            switch (stringOp.op) {
              case StringOp_Operator.EQ:
                return attr === stringOp.values[0];
              case StringOp_Operator.CONTAINS:
                return attr.indexOf(stringOp.values[0]) >= 0;
            }
        }
    }
  }

  return false;
};

export const hash = async (
  name: string,
  keys: Key[],
  salt: string,
  attrs?: Attributes
): Promise<bigint> => {
  if (!attrs) {
    throw new FeatureToggleError(`no attributes passed for feature toggle ${name}`);
  }
  if (!keys.length) {
    throw new FeatureToggleError(`no attribues defined for feature toggle ${name}`);
  }
  for (const key of keys) {
    if (!key.key.length) {
      throw new FeatureToggleError(`empty key defined for feature toggle ${name}`);
    }
    const attr = attrs[key.key];
    if (attr === undefined) {
      continue;
    }

    let v = salt;
    switch (key.keyType) {
      case Key_Type.BOOLEAN:
        if (typeof attr !== 'boolean') {
          throw new FeatureToggleError(
            `expected boolean value for attribute ${key.key} and feature toggle ${name}`
          );
        }
        v += !!attr ? 'true' : 'false';
        break;
      case Key_Type.STRING:
        if (typeof attr !== 'string') {
          throw new FeatureToggleError(
            `expected string value for attribute ${key.key} and feature toggle ${name}`
          );
        }
        v += attr;
        break;
      case Key_Type.FLOAT:
        if (typeof attr !== 'number') {
          throw new FeatureToggleError(
            `expected number value for attribute ${key.key} and feature toggle ${name}`
          );
        }
        v += String(attr);
        break;
      case Key_Type.INT:
        if (typeof attr !== 'number' && typeof attr !== 'bigint') {
          throw new FeatureToggleError(
            `expected number|bigint value for attribute ${key.key} and feature toggle ${name}`
          );
        }
        v += String(attr);
        break;
      case Key_Type.DATE_TIME:
        if (!(attr instanceof Date)) {
          throw new FeatureToggleError(
            `expected Date value for attribute ${key.key} and feature toggle ${name}`
          );
        }
        v += String(attr.getTime());
        break;
      default:
        throw new FeatureToggleError(
          `unknown attribute type for attribute ${key.key} and feature toggle ${name}`
        );
    }
    return (await xxhash()).h64(v);
  }

  throw new FeatureToggleError(`no matching attribute for ${name}`);
};
