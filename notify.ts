import express, { Request, Response } from 'express';
import apn from '@parse/node-apn';
import dotenv from 'dotenv';
import { Provider } from '@parse/node-apn';

dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;

// Explicitly type the isProduction parameter
const createApnProvider = (isProduction: boolean): Provider => {
  return new apn.Provider({
    token: {
      key: process.env.APNS_KEY_PATH!,
      keyId: process.env.APNS_KEY_ID!,
      teamId: process.env.APNS_TEAM_ID!
    },
    production: isProduction
  });
};

// External management of the production flag's state
let isProductionEnvironment = true;

app.post('/notify', async (req: Request, res: Response) => {
  const deviceToken = req.body.push_token;
 let note = new apn.Notification({
    alert: {
      title: req.body.title,
      body: req.body.message,
    },
    sound: 'default',
    topic: 'se.laross.IntelliNest',
    ...(req.body.group && {'thread-id': req.body.group}),
  });

  let apnProvider = createApnProvider(isProductionEnvironment);

  try {
    let result = await apnProvider.send(note, deviceToken);
    const badDeviceTokenError = result.failed.find(failure => failure.response?.reason === 'BadDeviceToken');

    if (badDeviceTokenError) {
      console.log('Retrying with production flag set to false due to BadDeviceToken error.');
      isProductionEnvironment = !isProductionEnvironment; // Toggle the flag based on error
      apnProvider = createApnProvider(isProductionEnvironment);
      result = await apnProvider.send(note, deviceToken);
    }

    if (result.failed.length > 0) {
      result.failed.forEach(failure => {
        console.error('Failed notification:', failure);
        if (failure.response) {
          console.error('APNS response:', JSON.stringify(failure.response));
        }
      });
      res.status(500).json({ message: "Failed to send notification", details: result.failed });
    } else {
      res.json({ message: "Notification sent successfully" });
    }
  } catch (error) {
    console.error('Exception sending notification:', error);
    res.status(500).json({ message: "Exception in sending notification", error: error });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
 
