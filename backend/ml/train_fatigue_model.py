
from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# Project paths
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BACKEND_DIR / "data" / "mindblaze_fatigue_cleaned_initial.csv"
MODEL_DIR = BACKEND_DIR / "ml" / "artifacts"

TARGET = "fatigue_rating_0_to_10"

NUMERIC_FEATURES = [
    "work_hours",
    "interruption_count",
    "pending_task_minutes",
    "task_difficulty_1_to_5",
    "sleep_hours",
]

CATEGORICAL_FEATURES = ["activity_type"]


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}\n"
            "Place the cleaned CSV inside backend/data/."
        )

    df = pd.read_csv(DATA_PATH)

    required = [TARGET] + NUMERIC_FEATURES + CATEGORICAL_FEATURES
    missing_columns = [c for c in required if c not in df.columns]

    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")

    # Keep only rows with a valid target.
    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    df = df.dropna(subset=[TARGET]).copy()

    # Validate the target range.
    df = df[df[TARGET].between(0, 10)]

    if len(df) < 20:
        raise ValueError(
            f"Only {len(df)} valid observations remain. "
            "Inspect the data before training."
        )

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES].copy()
    y = df[TARGET].astype(float)

    for column in NUMERIC_FEATURES:
        X[column] = pd.to_numeric(X[column], errors="coerce")

    # Prevent impossible values from silently entering training.
    valid_ranges = {
        "work_hours": (0, 24),
        "interruption_count": (0, None),
        "pending_task_minutes": (0, None),
        "task_difficulty_1_to_5": (1, 5),
        "sleep_hours": (0, 24),
    }

    for column, (lower, upper) in valid_ranges.items():
        invalid = X[column] < lower
        if upper is not None:
            invalid |= X[column] > upper
        if invalid.fillna(False).any():
            raise ValueError(
                f"Invalid values found in {column}. "
                "Review the source data before training."
            )

    # Prepare numeric and categorical features separately.
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer([
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
        ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
    ])

    models = {
        "Median baseline": DummyRegressor(strategy="median"),
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest": RandomForestRegressor(
            n_estimators=200,
            max_depth=4,
            min_samples_leaf=3,
            random_state=42,
        ),
    }

    # Same shuffled folds for every model.
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    results = []
    predictions_by_model = {}

    for name, estimator in models.items():
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("model", estimator),
        ])

        # Each observation is predicted by a model that did not
        # train on that observation's fold.
        predictions = cross_val_predict(pipeline, X, y, cv=cv)
        predictions_by_model[name] = predictions

        results.append({
            "model": name,
            "MAE": round(mean_absolute_error(y, predictions), 3),
            "RMSE": round(
                mean_squared_error(y, predictions) ** 0.5, 3
            ),
            "R2": round(r2_score(y, predictions), 3),
        })

    results_df = pd.DataFrame(results).sort_values("MAE")
    print("\nCross-validation results (lower MAE/RMSE is better):")
    print(results_df.to_string(index=False))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(MODEL_DIR / "model_comparison.csv", index=False)

    # Select by cross-validated MAE, then fit on all available data.
    best_name = results_df.iloc[0]["model"]
    best_estimator = models[best_name]

    final_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", best_estimator),
    ])
    final_pipeline.fit(X, y)

    joblib.dump(final_pipeline, MODEL_DIR / "fatigue_model.joblib")

    metadata = {
        "selected_model": best_name,
        "training_rows": int(len(df)),
        "target": TARGET,
        "features": NUMERIC_FEATURES + CATEGORICAL_FEATURES,
        "validation": "5-fold shuffled cross-validation",
        "warning": (
            "Small exploratory dataset. Cross-validation estimates "
            "are uncertain and do not establish clinical validity."
        ),
    }

    with open(MODEL_DIR / "model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSelected model: {best_name}")
    print(f"Model saved to: {MODEL_DIR / 'fatigue_model.joblib'}")
    print(f"Metrics saved to: {MODEL_DIR / 'model_comparison.csv'}")
    print("\nThese results are exploratory, not proof of generalization.")


if __name__ == "__main__":
    main()
