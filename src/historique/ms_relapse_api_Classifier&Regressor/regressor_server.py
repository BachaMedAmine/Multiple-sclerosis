import os
from flask import Flask, request, jsonify
import joblib
import pandas as pd
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(BASE_DIR, "relapse_regressor.pkl")
    regressor = joblib.load(model_path)
    logging.info(f"Regressor model loaded from {model_path}")
except FileNotFoundError:
    logging.error(f"Regressor model file not found at {model_path}")
    raise

@app.route("/predict-next-relapse", methods=["POST"])
def predict_next_relapse():
    data = request.json
    try:
        input_df = pd.DataFrame([{
            "patient_id": data["patient_id"],
            "duration_hours": data["duration_hours"],
            "hour_of_day": data["hour_of_day"],
            "day_of_week": data["day_of_week"],
            "days_since_prev_relapse": data["days_since_prev_relapse"],
            "relapse_count": data["relapse_count"],
            "relapse_level": data["relapse_level"]
        }])

        predicted_days = float(regressor.predict(input_df)[0])
        predicted_date = (datetime.now() + timedelta(days=predicted_days)).strftime("%Y-%m-%d")

        response = {
            "predicted_days_to_next_relapse": round(predicted_days, 2),
            "predicted_next_relapse_date": predicted_date
        }
        logging.info(f"Regressor prediction: {response}")
        return jsonify(response)

    except Exception as e:
        logging.error(f"Error during regressor prediction: {e}")
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get("REGRESSOR_PORT", 6003))  # Use specific env var
    app.run(host="0.0.0.0", port=port)