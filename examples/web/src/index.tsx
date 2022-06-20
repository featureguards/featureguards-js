import featureguards, { IFeatureGuards } from 'featureguards-web';
import React, { FunctionComponent as FC, useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom/client';

import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Switch,
  TextField,
  Typography
} from '@mui/material';

export const Demo: FC = () => {
  const [featureGuards, setFeatureGuards] = useState<IFeatureGuards>();
  const [featureName, setFeatureName] = useState<string>('');
  const [on, setOn] = useState<boolean>(false);

  const init = async () => {
    const fg = await featureguards({
      authCallback: async () => {
        // Insert your code here to call your server endpoint, which calls
        // 'authenticate' in FeatureGuards SDK and return accessToken/refreshToken
        return {
          accessToken: 'foo',
          refreshToken: 'bar'
        };
      }
    });
    setFeatureGuards(fg);
  };

  const handleClick = async () => {
    if (!featureGuards) {
      return;
    }
    const isOn = await featureGuards?.isOn(featureName);
    setOn(isOn);
  };

  useEffect(() => {
    init();
  }, []);
  if (!featureGuards) {
    return <CircularProgress />;
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Typography variant="h4">FeatureGuards Demo</Typography>
      <Typography>An example for using FeatureGuards with React</Typography>
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <FormControl sx={{ mx: 3, mt: 2 }}>
          <TextField
            label="Feature"
            id="feature"
            size="small"
            aria-describedby="feature"
            variant="outlined"
            sx={{ minWidth: 200 }}
            onChange={(e) => {
              setFeatureName(e.target.value);
            }}
          />
          <FormHelperText id="feature-text">Feature guard name.</FormHelperText>
        </FormControl>
        <FormControlLabel disabled control={<Switch />} label="On/Off" checked={on} />
        <Button onClick={handleClick} variant="contained" sx={{ maxHeight: 30, ml: 5 }}>
          Check
        </Button>
      </Container>
    </Box>
  );
};

const domContainer = document.querySelector('#container');
if (domContainer) {
  const root = ReactDOM.createRoot(domContainer);
  root.render(<Demo />);
}
