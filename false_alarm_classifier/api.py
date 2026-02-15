"""
False Alarm Classifier - API Service
Flask API for running ML inference on signalements
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# Load the trained model
MODEL_PATH = 'false_alarm_model.pkl'
model = None

def load_model():
    """Load the ML model"""
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded from {MODEL_PATH}")
    else:
        print(f"⚠️  Model file not found at {MODEL_PATH}")
        print("Please run train_model.py first!")

# Load model on startup
load_model()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict if a signalement is a false alarm
    
    Expected JSON body:
    {
        "description": "text description",
        "incidentType": "VIOLENCE|NEGLIGENCE|ABUS_SEXUEL|AUTRE",
        "urgencyLevel": "BAS|MOYEN|ELEVE|CRITIQUE",
        "aiSuspicionScore": 0-100
    }
    """
    try:
        if model is None:
            return jsonify({
                'error': 'Model not loaded. Please train the model first.'
            }), 500
        
        # Get request data
        data = request.json
        
        # Validate required fields
        required_fields = ['description', 'incidentType', 'urgencyLevel', 'aiSuspicionScore']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Prepare features for prediction
        features = pd.DataFrame([{
            'description': data['description'],
            'incidentType': data['incidentType'],
            'urgencyLevel': data['urgencyLevel'],
            'aiSuspicionScore': data['aiSuspicionScore']
        }])
        
        # Make prediction
        prediction = model.predict(features)[0]
        probability = model.predict_proba(features)[0]
        
        # probability[0] = probability of being real (False alarm = False)
        # probability[1] = probability of being false alarm (False alarm = True)
        confidence = float(probability[1]) if prediction else float(probability[0])
        
        result = {
            'is_false_alarm': bool(prediction),
            'confidence': round(confidence * 100, 2),
            'probabilities': {
                'real_signalement': round(float(probability[0]) * 100, 2),
                'false_alarm': round(float(probability[1]) * 100, 2)
            },
            'recommendation': get_recommendation(prediction, confidence)
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

def get_recommendation(is_false_alarm, confidence):
    """Get human-readable recommendation based on prediction"""
    if is_false_alarm:
        if confidence > 0.8:
            return "Forte probabilité de fausse alarme - Peut être marqué comme tel"
        elif confidence > 0.6:
            return "Probabilité modérée de fausse alarme - Vérifier les détails"
        else:
            return "Faible certitude - Investigation supplémentaire recommandée"
    else:
        if confidence > 0.8:
            return "Forte probabilité de signalement réel - Ne pas marquer comme fausse alarme"
        elif confidence > 0.6:
            return "Probabilité modérée de signalement réel - Procéder avec prudence"
        else:
            return "Faible certitude - Investigation supplémentaire recommandée"

@app.route('/reload-model', methods=['POST'])
def reload_model():
    """Reload the model (useful after retraining)"""
    load_model()
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None
    })

if __name__ == '__main__':
    print("🚀 Starting False Alarm Classifier API...")
    print("📊 Model status:", "Loaded ✅" if model else "Not loaded ⚠️")
    app.run(host='0.0.0.0', port=5001, debug=True)
