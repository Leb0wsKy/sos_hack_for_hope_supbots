# False Alarm Classifier

Machine Learning model to classify signalements as real or false alarms.

## Setup

1. Install Python dependencies:
```bash
cd false_alarm_classifier
pip install -r requirements.txt
```

2. Train the model:
```bash
python train_model.py
```

3. Start the API service:
```bash
python api.py
```

The API will run on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET http://localhost:5001/health
```

### Predict False Alarm
```
POST http://localhost:5001/predict
Content-Type: application/json

{
  "description": "Un enfant a été blessé gravement",
  "incidentType": "VIOLENCE",
  "urgencyLevel": "CRITIQUE",
  "aiSuspicionScore": 85
}
```

Response:
```json
{
  "is_false_alarm": false,
  "confidence": 92.5,
  "probabilities": {
    "real_signalement": 92.5,
    "false_alarm": 7.5
  },
  "recommendation": "Forte probabilité de signalement réel - Ne pas marquer comme fausse alarme"
}
```

## Integration with Backend

The backend calls this API before marking a signalement as false alarm to show prediction results to the user.
