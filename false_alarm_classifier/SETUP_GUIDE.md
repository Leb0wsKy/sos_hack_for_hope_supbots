# False Alarm Classifier - Setup Guide

## 🎯 Overview

This ML-powered classifier helps Level 2 users identify false alarm signalements using machine learning predictions.

## 📋 Prerequisites

- Python 3.8 or higher
- pip package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd false_alarm_classifier
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_model.py
```

This will create `false_alarm_model.pkl` with the trained ML model.

### 3. Start the ML API Service

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

Or manually:
```bash
python api.py
```

The service will run on `http://localhost:5001`

### 4. Start Backend & Frontend

Make sure your backend and frontend are running:

```bash
# Backend (in backend folder)
npm start

# Frontend (in frontend folder)
npm run dev
```

## 🔧 How It Works

### User Workflow

1. **Level 2 user** views a signalement in the dashboard
2. Clicks **"Fausse alarme"** button
3. **ML model analyzes** the signalement:
   - Description text (using NLP)
   - Incident type
   - Urgency level  
   - AI suspicion score
4. **Prediction dialog** shows:
   - ✅ Real signalement or ❌ False alarm
   - Confidence percentage
   - Detailed probabilities
   - Recommendation
5. User can **confirm or cancel** based on ML prediction

### ML Model Features

The model uses:
- **TF-IDF** for text analysis (French language)
- **Random Forest Classifier** (100 trees)
- Balanced class weights for fair predictions
- Multiple features: text + categorical + numerical

### API Endpoints

#### Health Check
```http
GET http://localhost:5001/health
```

Response:
```json
{
  "status": "ok",
  "model_loaded": true
}
```

#### Predict False Alarm
```http
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

## 📊 Model Training

### Training Data

The model is trained on sample data with:
- Real signalements (serious incidents)
- False alarms (non-incidents, tests, vague reports)

### Features Used

1. **Description** (text): NLP analysis of the signalement description
2. **Incident Type**: VIOLENCE, NEGLIGENCE, ABUS_SEXUEL, AUTRE
3. **Urgency Level**: BAS, MOYEN, ELEVE, CRITIQUE
4. **AI Suspicion Score**: 0-100 (from initial AI screening)

### Retraining

To retrain with new data:

1. Edit `train_model.py` and add more training examples
2. Run:
   ```bash
   python train_model.py
   ```
3. Reload the model in the API:
   ```http
   POST http://localhost:5001/reload-model
   ```

## 🔍 Testing

Test the API manually:

```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test du système",
    "incidentType": "AUTRE",
    "urgencyLevel": "BAS",
    "aiSuspicionScore": 10
  }'
```

## 🚧 Troubleshooting

### Model not loaded
- Ensure `python train_model.py` completed successfully
- Check that `false_alarm_model.pkl` exists in the folder

### API connection error
- Verify the ML service is running on port 5001
- Check no firewall is blocking the port
- Look at API logs for errors

### Backend cannot connect to ML service
- The backend expects ML service at `http://localhost:5001`
- If ML service fails, backend returns a fallback response
- User can still manually mark as false alarm

## 📈 Future Improvements

- Add more training data based on real signalements
- Incorporate additional features (attachments, location, etc.)
- Use deep learning models (BERT, transformers) for better text understanding
- Real-time model retraining from user feedback
- A/B testing different ML algorithms

## 🎓 Model Performance

With current training data:
- Training accuracy: ~95%
- Test accuracy: ~85%

**Note:** This is a proof-of-concept. In production, train on thousands of real signalements for better accuracy.
