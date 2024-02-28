import { Request, Response } from "express";
import apn, { Provider } from "@parse/node-apn";

const createApnProvider = (isProduction: boolean): Provider => {
  return new apn.Provider({
    token: {
      key: process.env.APNS_KEY_PATH || "",
      keyId: process.env.APNS_KEY_ID || "",
      teamId: process.env.APNS_TEAM_ID || "",
    },
    production: isProduction,
  });
};

async function handlePostNotify(req: Request, res: Response) {
  const deviceToken = req.body.push_token;
  let isProductionEnvironment = true;
  let apnProvider = createApnProvider(isProductionEnvironment);
  let note = new apn.Notification({
    alert: {
      title: req.body.title,
      body: req.body.message,
    },
    sound: "default",
    topic: "se.laross.IntelliNest",
    ...(req.body.group && { "thread-id": req.body.group }),
  });

  try {
    let result = await apnProvider.send(note, deviceToken);
    const badDeviceTokenError = result.failed.find(
      (failure) => failure.response?.reason === "BadDeviceToken",
    );

    if (badDeviceTokenError) {
      console.log(
        "Retrying with production flag set to false due to BadDeviceToken error.",
      );
      isProductionEnvironment = !isProductionEnvironment; // Toggle the flag based on error
      apnProvider = createApnProvider(isProductionEnvironment);
      result = await apnProvider.send(note, deviceToken);
    }

    if (result.failed.length > 0) {
      result.failed.forEach((failure) => {
        console.error("Failed notification:", failure);
        if (failure.response) {
          console.error("APNS response:", JSON.stringify(failure.response));
        }
      });
      return res.status(500).json({
        message: "Failed to send notification",
        details: result.failed,
      });
    } else {
      return res.json({ message: "Notification sent successfully" });
    }
  } catch (error) {
    console.error("Exception sending notification:", error);
    res
      .status(500)
      .json({ message: "Exception in sending notification", error: error });
  }
}

const notify = {
  handlePostNotify,
};

export default notify;
