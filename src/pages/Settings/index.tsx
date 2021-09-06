import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { withTranslation, WithTranslation } from 'react-i18next';
import styled from '@emotion/styled';
import { Field, Form, Formik } from 'formik';
import { Button, Grid, Paper } from '@material-ui/core';
import { useHistory } from 'react-router-dom';
import Page from '../../components/Page';
import FormikTextField from '../../components/TextField';
import { useWallet } from '../../wallet/hooks';
import { CFMM_ADDRESS, RPC_PORT, RPC_URL } from '../../utils/globals';
import {
  getCfmmContract,
  getNodePort,
  getNodeURL,
  isValidContract,
  isValidPort,
  isValidURL,
  updateCFMMContract,
  updateNodePort,
  updateNodeURL,
} from '../../utils/settingUtils';
import { initTezos } from '../../contracts/client';
import { logger } from '../../utils/logger';
import { initContracts } from '../../contracts/cfmm';

const PaperStyled = styled(Paper)`
  padding: 2em;
`;

interface SettingsForm {
  nodeUrl: string;
  nodePort: number | string;
  cfmm: string;
}

const SettingsComponent: React.FC<WithTranslation> = ({ t }) => {
  const [{ pkh: userAddress }] = useWallet();
  const [initialValues, setInitialValues] = useState<SettingsForm>({
    nodeUrl: '',
    nodePort: '',
    cfmm: '',
  });
  const history = useHistory();

  const handleFormSubmit = async (data: SettingsForm) => {
    if (userAddress) {
      updateNodeURL(userAddress, data.nodeUrl);
      updateNodePort(userAddress, String(data.nodePort));
      updateCFMMContract(userAddress, data.cfmm);
      try {
        initTezos(data.nodeUrl, data.nodePort);
        await initContracts(data.cfmm);
        history.push('/');
      } catch (error) {
        logger.error(error);
      }
    }
  };

  useEffect(() => {
    if (userAddress) {
      setInitialValues({
        nodeUrl: getNodeURL(userAddress) ?? RPC_URL,
        nodePort: getNodePort(userAddress) ?? RPC_PORT,
        cfmm: getCfmmContract(userAddress) ?? CFMM_ADDRESS,
      });
    }
  }, [userAddress]);

  if (!userAddress) {
    history.push('/');
    return <></>;
  }

  const validationSchema = Yup.object().shape({
    nodeUrl: Yup.string()
      .test({
        test: (value) => {
          if (value) {
            return isValidURL(value);
          }
          return true;
        },
        message: t('invalidUrl'),
      })
      .optional(),
    nodePort: Yup.number()
      .test({
        test: (value) => {
          if (value) {
            return isValidPort(value);
          }
          return true;
        },
        message: t('invalidPort'),
      })
      .optional(),
    cfmm: Yup.string()
      .test({
        test: (value) => {
          if (value) {
            return isValidContract(value);
          }
          return true;
        },
        message: t('invalidContract'),
      })
      .optional(),
  });

  return (
    <Page title={t('settings')}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleFormSubmit}
        validateOnMount
        enableReinitialize
      >
        {({ isSubmitting, isValid, dirty }) => (
          <PaperStyled>
            <Form>
              <Grid
                container
                spacing={4}
                direction="column"
                alignContent="center"
                justifyContent="center"
              >
                <Grid item sx={{ minWidth: '51%' }}>
                  <Field
                    component={FormikTextField}
                    name="nodeUrl"
                    id="nodeUrl"
                    label={t('nodeUrl')}
                    className="nodeUrl"
                    type="text"
                    fullWidth
                  />
                </Grid>
                <Grid item>
                  <Field
                    component={FormikTextField}
                    name="nodePort"
                    id="nodePort"
                    label={t('nodePort')}
                    className="nodePort"
                    type="number"
                    fullWidth
                  />
                </Grid>
                <Grid item>
                  <Field
                    component={FormikTextField}
                    name="cfmm"
                    id="cfmm"
                    label={t('cfmmContract')}
                    className="cfmm"
                    type="text"
                    fullWidth
                  />
                </Grid>

                <Grid item>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={isSubmitting || !isValid || !dirty || !userAddress}
                    fullWidth
                  >
                    {t('submit')}
                  </Button>
                </Grid>
              </Grid>
            </Form>
          </PaperStyled>
        )}
      </Formik>
    </Page>
  );
};

export const Settings = withTranslation(['common'])(SettingsComponent);
