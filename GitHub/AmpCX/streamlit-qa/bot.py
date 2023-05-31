import os
import pathlib
import logging
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from answer import answer_question
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Initialize the app with your bot's access token
app = App(token="xoxb-5069489846051-5311883125233-nB2pwYVGPKkpwOaApmQvr3gi")

# Path to the service account key JSON file
FILE_LOC = pathlib.Path(__file__).parent.resolve()
FIRESTORE_JSON = "ampcx-c65ee-firebase-adminsdk-iuhyp-d6d9fc8335.json"
FIRESTORE_CREDS = f"{FILE_LOC}/../assets/{FIRESTORE_JSON}"

# Initialize Firebase Admin with the app's credentials
try:
    cred = credentials.Certificate(FIRESTORE_CREDS)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    logging.error("Could not initialize Firestore: ", e)

@app.event("app_mention")
def ask_who(ack, body, say, client):
    logging.debug("Handling app_mention event")

    # Acknowledge the event
    ack()

    # Extract the question from the event text, discarding the app mention
    text = body['event']['text'][14:]

    # Get the timestamp and thread timestamp for the current message
    message_ts = body["event"]["ts"]
    thread_ts = body["event"].get("thread_ts") or message_ts

    # Assume the text is a question and attempt to get an answer
    try:
        answer = answer_question(text)
    except Exception as e:
        logging.error("Could not get an answer to the question: ", e)
        return

    # Respond to the question with the answer and a link to more information
    say(
        text=f"{answer.answer}\nSee <{answer.article.link}|this link> for more information.",
        thread_ts=thread_ts
    )


    # Prepare the data to be stored in Firestore
    data = {
        'question': text,
        'answer': answer.answer,
        'timestamp': datetime.now()
    }

    logging.debug("Updating Firestore")

    team_info = client.team_info()
    team_id = team_info['team']['id']
    team_name = team_info['team']['name']
    logging.debug(team_name)
    # Get a reference to the Firestore document where conversations are stored
    doc_ref = db.collection("slackConvos").document(team_name)

    try:
        doc = doc_ref.get()

        # If the document exists, append the new conversation to the existing ones
        if doc.exists:
            conversations = doc.get("conversations")
            conversations.append(data)
            doc_ref.update({'conversations': conversations})
        # If the document does not exist, create it with the new conversation
        else:
            doc_ref.set({'conversations': [data]})
    except Exception as e:
        logging.error("Could not update Firestore: ", e)
    
    logging.debug("Firestore update completed")

def main():
    # Run the bot using the app token and the bot token
    handler = SocketModeHandler(app, "xapp-1-A058CLGVC4F-5329019499536-b1a65dbc960294900e36d629a2a5f0dcf71866f457e89a45c55ef4ee97a029b5")
    handler.start()

if __name__ == "__main__":
    main()
