"""
False Alarm Classifier - Training Script
Trains a machine learning model to detect false alarm signalements
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
import joblib
import json

# Sample training data - In production, this would come from your database
training_data = [
    {
        "description": "Un enfant a été blessé gravement lors d'une bagarre avec un autre enfant",
        "incidentType": "VIOLENCE",
        "urgencyLevel": "CRITIQUE",
        "aiSuspicionScore": 85,
        "is_false_alarm": False
    },
    {
        "description": "Je pense que quelque chose ne va pas mais je ne suis pas sûr",
        "incidentType": "AUTRE",
        "urgencyLevel": "BAS",
        "aiSuspicionScore": 40,
        "is_false_alarm": True
    },
    {
        "description": "Un enfant montre des signes de négligence sévère, très maigre et sale",
        "incidentType": "NEGLIGENCE",
        "urgencyLevel": "ELEVE",
        "aiSuspicionScore": 75,
        "is_false_alarm": False
    },
    {
        "description": "Un enfant a dit qu'il n'aimait pas la nourriture",
        "incidentType": "AUTRE",
        "urgencyLevel": "BAS",
        "aiSuspicionScore": 20,
        "is_false_alarm": True
    },
    {
        "description": "Abus sexuel signalé par l'enfant lui-même avec des détails précis",
        "incidentType": "ABUS_SEXUEL",
        "urgencyLevel": "CRITIQUE",
        "aiSuspicionScore": 90,
        "is_false_alarm": False
    },
    {
        "description": "Je veux juste vérifier si tout va bien",
        "incidentType": "AUTRE",
        "urgencyLevel": "BAS",
        "aiSuspicionScore": 15,
        "is_false_alarm": True
    },
    {
        "description": "Un enfant s'est plaint d'un adulte qui le frappe régulièrement",
        "incidentType": "VIOLENCE",
        "urgencyLevel": "ELEVE",
        "aiSuspicionScore": 80,
        "is_false_alarm": False
    },
    {
        "description": "Un adulte a crié sur un enfant",
        "incidentType": "VIOLENCE",
        "urgencyLevel": "MOYEN",
        "aiSuspicionScore": 35,
        "is_false_alarm": True
    },
    {
        "description": "Un enfant manque souvent l'école et semble déprimé",
        "incidentType": "NEGLIGENCE",
        "urgencyLevel": "MOYEN",
        "aiSuspicionScore": 60,
        "is_false_alarm": False
    },
    {
        "description": "Rien de grave, juste une petite question",
        "incidentType": "AUTRE",
        "urgencyLevel": "BAS",
        "aiSuspicionScore": 10,
        "is_false_alarm": True
    },
    {
        "description": "Violence physique répétée avec traces visibles de coups",
        "incidentType": "VIOLENCE",
        "urgencyLevel": "CRITIQUE",
        "aiSuspicionScore": 95,
        "is_false_alarm": False
    },
    {
        "description": "Test du système",
        "incidentType": "AUTRE",
        "urgencyLevel": "BAS",
        "aiSuspicionScore": 5,
        "is_false_alarm": True
    },
    {
        "description": "Un enfant ne reçoit pas ses repas régulièrement et semble affamé",
        "incidentType": "NEGLIGENCE",
        "urgencyLevel": "ELEVE",
        "aiSuspicionScore": 78,
        "is_false_alarm": False
    },
    {
        "description": "Un enfant a pleuré aujourd'hui",
        "incidentType": "AUTRE",
        "urgencyLevel": "BAS",
        "aiSuspicionScore": 25,
        "is_false_alarm": True
    },
    {
        "description": "Abus verbal constant et humiliation publique d'un enfant",
        "incidentType": "VIOLENCE",
        "urgencyLevel": "ELEVE",
        "aiSuspicionScore": 72,
        "is_false_alarm": False
    }
]

def train_model():
    """Train the false alarm classifier model"""
    print("Starting model training...")
    
    # Convert to DataFrame
    df = pd.DataFrame(training_data)
    
    # Features and target
    X = df[['description', 'incidentType', 'urgencyLevel', 'aiSuspicionScore']]
    y = df['is_false_alarm']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Create feature transformers
    text_transformer = TfidfVectorizer(
        max_features=100,
        ngram_range=(1, 2)
    )
    
    # Create preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('text', text_transformer, 'description'),
            ('categorical', OneHotEncoder(handle_unknown='ignore'), ['incidentType', 'urgencyLevel']),
            ('numerical', 'passthrough', ['aiSuspicionScore'])
        ]
    )
    
    # Create full pipeline with classifier
    model = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        ))
    ])
    
    # Train the model
    print("Training model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    print(f"Training accuracy: {train_score:.2%}")
    print(f"Testing accuracy: {test_score:.2%}")
    
    # Save the model
    joblib.dump(model, 'false_alarm_model.pkl')
    print("Model saved as 'false_alarm_model.pkl'")
    
    # Save feature names for reference
    feature_info = {
        'incident_types': ['VIOLENCE', 'NEGLIGENCE', 'ABUS_SEXUEL', 'AUTRE'],
        'urgency_levels': ['BAS', 'MOYEN', 'ELEVE', 'CRITIQUE']
    }
    with open('feature_info.json', 'w', encoding='utf-8') as f:
        json.dump(feature_info, f, ensure_ascii=False, indent=2)
    
    return model

if __name__ == "__main__":
    train_model()
    print("\n✅ Model training complete!")
