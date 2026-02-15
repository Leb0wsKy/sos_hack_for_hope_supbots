@echo off
echo Starting False Alarm Classifier ML Service...

REM Check if model exists
if not exist "false_alarm_model.pkl" (
    echo Model not found. Training model first...
    python train_model.py
)

echo Starting API server on port 5001...
python api.py
