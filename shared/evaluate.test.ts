import type { Attributes } from './attributes';
import { hash, isOn, match } from './evaluate';
import { Timestamp } from './proto/google/protobuf/timestamp';
import {
  DateTimeOp_Operator,
  FeatureToggle_Type,
  FloatOp_Operator,
  IntOp_Operator,
  Key_Type,
  Stickiness_Type,
  StringOp_Operator
} from './proto/shared/feature_toggle';

const attrs: Attributes = {
  user_id: 123.0,
  company_id: BigInt(123),
  company_slug: 'FeatureGuards',
  is_admin: true,
  created_at: new Date('2019-10-12T07:20:50.52Z')
};

describe('hashing', () => {
  describe('float operations', () => {
    it('hashes a float', async () => {
      const v = await hash('FOO', [{ key: 'user_id', keyType: Key_Type.FLOAT }], '', attrs);
      expect(v).toEqual(BigInt('4353148100880623749'));
    });

    it('returns an error for wrong float type', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'company_slug', keyType: Key_Type.FLOAT }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch(
          'expected number value for attribute company_slug and feature toggle FOO'
        )
      );
    });
  });

  describe('int operations', () => {
    it('hashes a bigint', async () => {
      const v = await hash('FOO', [{ key: 'company_id', keyType: Key_Type.INT }], '', attrs);
      expect(v).toEqual(BigInt('4353148100880623749'));
    });
    it('hashes a number', async () => {
      const v = await hash('FOO', [{ key: 'user_id', keyType: Key_Type.INT }], '', attrs);
      expect(v).toEqual(BigInt('4353148100880623749'));
    });

    it('returns an error for non bigint|number attributes', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'company_slug', keyType: Key_Type.INT }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch(
          'expected number|bigint value for attribute company_slug and feature toggle FOO'
        )
      );
    });
  });

  describe('string operations', () => {
    it('hashes a string', async () => {
      const v = await hash('FOO', [{ key: 'company_slug', keyType: Key_Type.STRING }], '', attrs);
      expect(v).toEqual(BigInt('15324770540884756055'));
    });
    it('hashes a string with a hash', async () => {
      const v = await hash(
        'FOO',
        [{ key: 'company_slug', keyType: Key_Type.STRING }],
        'foo',
        attrs
      );
      expect(v).toEqual(BigInt('13498803372803212218'));
    });

    it('hashes a string with a different hash', async () => {
      const v = await hash(
        'FOO',
        [{ key: 'company_slug', keyType: Key_Type.STRING }],
        'FoO',
        attrs
      );
      expect(v).toEqual(BigInt('6440734465410601463'));
    });

    it('returns an error for non string attributes', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'company_id', keyType: Key_Type.STRING }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch(
          'expected string value for attribute company_id and feature toggle FOO'
        )
      );
    });
  });

  describe('boolean operations', () => {
    it('hashes a boolean', async () => {
      const v = await hash('FOO', [{ key: 'is_admin', keyType: Key_Type.BOOLEAN }], '', attrs);
      expect(v).toEqual(BigInt('15549163119024811594'));
    });

    it('returns an error for wrong boolean type', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'company_slug', keyType: Key_Type.BOOLEAN }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch(
          'expected boolean value for attribute company_slug and feature toggle FOO'
        )
      );
    });
  });

  describe('Date operations', () => {
    it('hashes a Date', async () => {
      const v = await hash('FOO', [{ key: 'created_at', keyType: Key_Type.DATE_TIME }], '', attrs);
      expect(v).toEqual(BigInt('16092501893693493459'));
    });

    it('returns an error for wrong Date type', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'company_slug', keyType: Key_Type.DATE_TIME }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch(
          'expected Date value for attribute company_slug and feature toggle FOO'
        )
      );
    });
  });

  describe('invalid operations', () => {
    it('returns an error for a missing attribute', async () => {
      const v = await hash('FOO', [{ key: 'is_admin', keyType: Key_Type.BOOLEAN }], '', attrs);
      expect(v).toEqual(BigInt('15549163119024811594'));
    });

    it('returns an error for wrong boolean type', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'IS_ADMIN', keyType: Key_Type.BOOLEAN }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch('no matching attribute for FOO')
      );
    });

    it('returns an error for an empty key', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: '', keyType: Key_Type.BOOLEAN }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch('empty key defined for feature toggle FOO')
      );
    });

    it('returns an error unknown key type', async () => {
      expect.assertions(1);
      hash('FOO', [{ key: 'is_admin', keyType: 10 }], '', attrs).catch((e) =>
        expect((e as Error).message).toMatch(
          'unknown attribute type for attribute is_admin and feature toggle FOO'
        )
      );
    });
  });
});

describe('match', () => {
  describe('string operations', () => {
    it('matches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.EQ, values: ['FeatureGuards'] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.EQ, values: ['featureguards'] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('mismatches empty eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.EQ, values: [''] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches contains operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.CONTAINS, values: ['Guards'] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches contains operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.CONTAINS, values: ['guards'] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches in operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.IN, values: ['foo', 'FeatureGuards'] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches in operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_slug', keyType: Key_Type.STRING },
            operation: {
              oneofKind: 'stringOp',
              stringOp: { op: StringOp_Operator.IN, values: ['foo', 'featureguards'] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });
  });

  describe('boolean operations', () => {
    it('matches', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'is_admin', keyType: Key_Type.BOOLEAN },
            operation: {
              oneofKind: 'boolOp',
              boolOp: { value: true }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'is_admin', keyType: Key_Type.BOOLEAN },
            operation: {
              oneofKind: 'boolOp',
              boolOp: { value: false }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });
  });

  describe('float operations', () => {
    it('matches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.EQ, values: [123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.EQ, values: [1234] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches neq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.NEQ, values: [1234] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches neq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.NEQ, values: [123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches gt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.GT, values: [122] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches gt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.GT, values: [123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches gte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.GTE, values: [123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches gte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.GTE, values: [124] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches lt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.LT, values: [124] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches lt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.LT, values: [123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches lte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.LTE, values: [123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches lte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.LTE, values: [122] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches in operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.IN, values: [-1, 2, 123] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches in operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'user_id', keyType: Key_Type.FLOAT },
            operation: {
              oneofKind: 'floatOp',
              floatOp: { op: FloatOp_Operator.IN, values: [0, 1234] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });
  });

  describe('int operations', () => {
    it('matches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.EQ, values: [BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches eq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.EQ, values: [BigInt(1234)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches neq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.NEQ, values: [BigInt(1234)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches neq operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.NEQ, values: [BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches gt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.GT, values: [BigInt(122)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches gt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.GT, values: [BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches gte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.GTE, values: [BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches gte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.GTE, values: [BigInt(124)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches lt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.LT, values: [BigInt(124)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches lt operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.LT, values: [BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches lte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.LTE, values: [BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches lte operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.LTE, values: [BigInt(122)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches in operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.IN, values: [BigInt(-1), BigInt(123)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches in operation', async () => {
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'company_id', keyType: Key_Type.INT },
            operation: {
              oneofKind: 'intOp',
              intOp: { op: IntOp_Operator.IN, values: [BigInt(-1), BigInt(1234)] }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });
  });

  describe('Date operations', () => {
    it('matches after', async () => {
      const date = new Date(attrs['created_at'] as Date);
      date.setSeconds(date.getSeconds() - 20);
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'created_at', keyType: Key_Type.DATE_TIME },
            operation: {
              oneofKind: 'dateTimeOp',
              dateTimeOp: { op: DateTimeOp_Operator.AFTER, timestamp: Timestamp.fromDate(date) }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches after', async () => {
      const date = new Date(attrs['created_at'] as Date);
      date.setSeconds(date.getSeconds() + 1);
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'created_at', keyType: Key_Type.DATE_TIME },
            operation: {
              oneofKind: 'dateTimeOp',
              dateTimeOp: { op: DateTimeOp_Operator.AFTER, timestamp: Timestamp.fromDate(date) }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });

    it('matches before', async () => {
      const date = new Date(attrs['created_at'] as Date);
      date.setSeconds(date.getSeconds() + 1);
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'created_at', keyType: Key_Type.DATE_TIME },
            operation: {
              oneofKind: 'dateTimeOp',
              dateTimeOp: { op: DateTimeOp_Operator.BEFORE, timestamp: Timestamp.fromDate(date) }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(true);
    });

    it('mismatches before', async () => {
      const date = new Date(attrs['created_at'] as Date);
      date.setSeconds(date.getSeconds());
      const v = await match(
        'FOO',
        [
          {
            key: { key: 'created_at', keyType: Key_Type.DATE_TIME },
            operation: {
              oneofKind: 'dateTimeOp',
              dateTimeOp: { op: DateTimeOp_Operator.BEFORE, timestamp: Timestamp.fromDate(date) }
            }
          }
        ],
        attrs
      );
      expect(v).toBe(false);
    });
  });
});

describe('isOn', () => {
  describe('on/off feature toggle', () => {
    it('returns false for deleted', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          deletedAt: Timestamp.fromDate(new Date()),
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 100, matches: [] }, off: { weight: 0, matches: [] } }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });

    it('returns false for disabled', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: false,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 100, matches: [] }, off: { weight: 0, matches: [] } }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });

    it('is on', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 100, matches: [] }, off: { weight: 0, matches: [] } }
          }
        },
        attrs
      );
      expect(v).toBe(true);
    });

    it('throws for partial weights', async () => {
      expect.assertions(1);
      isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 99, matches: [] }, off: { weight: 0, matches: [] } }
          }
        },
        attrs
      ).catch((e) =>
        expect((e as Error).message).toMatch('feature toggle FOO has invalid weights')
      );
    });

    it('throws for equal weights', async () => {
      expect.assertions(1);
      isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 0, matches: [] }, off: { weight: 0, matches: [] } }
          }
        },
        attrs
      ).catch((e) =>
        expect((e as Error).message).toMatch('feature toggle FOO has invalid weights')
      );
    });
    it('throws for missing off', async () => {
      expect.assertions(1);
      isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 100, matches: [] } }
          }
        },
        attrs
      ).catch((e) => expect((e as Error).message).toMatch('feature toggle FOO is invalid'));
    });

    it('is off', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: { on: { weight: 0, matches: [] }, off: { weight: 100, matches: [] } }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });

    it('is on based on allowlist', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: {
              on: {
                weight: 0,
                matches: [
                  {
                    key: { key: 'user_id', keyType: Key_Type.FLOAT },
                    operation: {
                      oneofKind: 'floatOp',
                      floatOp: { op: FloatOp_Operator.EQ, values: [123] }
                    }
                  }
                ]
              },
              off: { weight: 100, matches: [] }
            }
          }
        },
        attrs
      );
      expect(v).toBe(true);
    });
    it('is off based on allowlist', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: {
              on: {
                weight: 0,
                matches: [
                  {
                    key: { key: 'user_id', keyType: Key_Type.FLOAT },
                    operation: {
                      oneofKind: 'floatOp',
                      floatOp: { op: FloatOp_Operator.EQ, values: [1234] }
                    }
                  }
                ]
              },
              off: { weight: 100, matches: [] }
            }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });

    it('is off based on disallowlist', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.ON_OFF,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'onOff',
            onOff: {
              on: {
                weight: 0,
                matches: [
                  {
                    key: { key: 'user_id', keyType: Key_Type.FLOAT },
                    operation: {
                      oneofKind: 'floatOp',
                      floatOp: { op: FloatOp_Operator.EQ, values: [123] }
                    }
                  }
                ]
              },
              off: {
                weight: 100,
                matches: [
                  {
                    key: { key: 'user_id', keyType: Key_Type.FLOAT },
                    operation: {
                      oneofKind: 'floatOp',
                      floatOp: { op: FloatOp_Operator.EQ, values: [123] }
                    }
                  }
                ]
              }
            }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });
  });

  describe('percentage feature toggle', () => {
    it('returns on for random with 100% weight', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.PERCENTAGE,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'percentage',
            percentage: {
              on: { weight: 100, matches: [] },
              off: { weight: 0, matches: [] },
              salt: '',
              stickiness: {
                stickinessType: Stickiness_Type.RANDOM,
                keys: []
              }
            }
          }
        },
        attrs
      );
      expect(v).toBe(true);
    });

    it('returns off for random with 0% weight', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.PERCENTAGE,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'percentage',
            percentage: {
              on: { weight: 0, matches: [] },
              off: { weight: 100, matches: [] },
              salt: '',
              stickiness: {
                stickinessType: Stickiness_Type.RANDOM,
                keys: []
              }
            }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });

    it('returns on for sticky with 70% weight', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.PERCENTAGE,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'percentage',
            percentage: {
              on: { weight: 70, matches: [] },
              off: { weight: 30, matches: [] },
              salt: '',
              stickiness: {
                stickinessType: Stickiness_Type.KEYS,
                keys: [{ key: 'user_id', keyType: Key_Type.FLOAT }]
              }
            }
          }
        },
        attrs
      );
      expect(v).toBe(true);
    });

    it('returns off for sticky with 60% weight', async () => {
      const v = await isOn(
        {
          name: 'FOO',
          enabled: true,
          toggleType: FeatureToggle_Type.PERCENTAGE,
          id: '123',
          projectId: 'proj1234',
          description: '',
          version: BigInt(1),
          platforms: [],
          featureDefinition: {
            oneofKind: 'percentage',
            percentage: {
              on: { weight: 60, matches: [] },
              off: { weight: 40, matches: [] },
              salt: '',
              stickiness: {
                stickinessType: Stickiness_Type.KEYS,
                keys: [{ key: 'user_id', keyType: Key_Type.FLOAT }]
              }
            }
          }
        },
        attrs
      );
      expect(v).toBe(false);
    });
  });
});
