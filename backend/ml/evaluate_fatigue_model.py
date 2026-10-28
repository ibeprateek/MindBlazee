
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "mindblaze_fatigue_cleaned_initial.csv"
OUTPUT_DIR = BASE_DIR / "ml" / "evaluation"

TARGET = "fatigue_rating_0_to_10"

NUMERIC_FEATURES = [
    "work_hours",
    "interruption_count",
    "pending_task_minutes",
    "task_difficulty_1_to_5",
    "sleep_hours",
]
CATEGORICAL_FEATURES = ["activity_type"]

MODELS = {
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


def make_pipeline(estimator):
    numeric = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer([
        ("numeric", numeric, NUMERIC_FEATURES),
        ("categorical", categorical, CATEGORICAL_FEATURES),
    ])

    return Pipeline([
        ("preprocessor", preprocessor),
        ("model", estimator),
    ])


def metrics(y_true, y_pred):
    return {
        "MAE": mean_absolute_error(y_true, y_pred),
        "RMSE": mean_squared_error(y_true, y_pred) ** 0.5,
        "R2": r2_score(y_true, y_pred),
    }


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    required = [TARGET] + NUMERIC_FEATURES + CATEGORICAL_FEATURES
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    df = df.dropna(subset=[TARGET]).copy()
    df = df[df[TARGET].between(0, 10)].reset_index(drop=True)

    for col in NUMERIC_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    if len(df) < 25:
        raise ValueError(
            f"Only {len(df)} valid observations remain; inspect the dataset."
        )

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES].copy()
    y = df[TARGET].astype(float)

    # Every participant contributed one response, so row-level folds
    # are appropriate for participant-independent evaluation.
    outer_cv = KFold(n_splits=5, shuffle=True, random_state=2026)

    predictions = {
        name: np.full(len(df), np.nan)
        for name in MODELS
    }
    selected_models = []
    nested_predictions = np.full(len(df), np.nan)

    for fold, (train_idx, test_idx) in enumerate(outer_cv.split(X), start=1):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

        # Evaluate each fixed model on the same held-out fold.
        for name, estimator in MODELS.items():
            pipeline = make_pipeline(estimator)
            pipeline.fit(X_train, y_train)
            predictions[name][test_idx] = pipeline.predict(X_test)

        # Select the model using ONLY the outer training fold.
        inner_cv = KFold(
            n_splits=4,
            shuffle=True,
            random_state=1000 + fold,
        )

        inner_scores = {}
        for name, estimator in MODELS.items():
            scores = cross_val_score(
                make_pipeline(estimator),
                X_train,
                y_train,
                cv=inner_cv,
                scoring="neg_mean_absolute_error",
            )
            inner_scores[name] = -scores.mean()

        chosen_name = min(inner_scores, key=inner_scores.get)
        selected_models.append(chosen_name)

        chosen_pipeline = make_pipeline(MODELS[chosen_name])
        chosen_pipeline.fit(X_train, y_train)
        nested_predictions[test_idx] = chosen_pipeline.predict(X_test)

        print(
            f"Outer fold {fold}: selected {chosen_name}; "
            f"held-out participants = {len(test_idx)}"
        )

    # Compare all fixed models and the nested model-selection procedure.
    rows = []
    for name, y_pred in predictions.items():
        row = {"evaluation": name}
        row.update(metrics(y, y_pred))
        rows.append(row)

    nested_row = {"evaluation": "Nested model selection"}
    nested_row.update(metrics(y, nested_predictions))
    rows.append(nested_row)

    results = pd.DataFrame(rows)
    results[["MAE", "RMSE", "R2"]] = results[["MAE", "RMSE", "R2"]].round(3)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results.to_csv(OUTPUT_DIR / "evaluation_metrics.csv", index=False)

    residual_rows = []
    for name, y_pred in predictions.items():
        for i, prediction in enumerate(y_pred):
            residual_rows.append({
                "row_index": i,
                "evaluation": name,
                "actual_fatigue": y.iloc[i],
                "predicted_fatigue": prediction,
                # Positive means the model underpredicted fatigue.
                "residual_actual_minus_predicted": y.iloc[i] - prediction,
                "absolute_error": abs(y.iloc[i] - prediction),
            })

    for i, prediction in enumerate(nested_predictions):
        residual_rows.append({
            "row_index": i,
            "evaluation": "Nested model selection",
            "actual_fatigue": y.iloc[i],
            "predicted_fatigue": prediction,
            "residual_actual_minus_predicted": y.iloc[i] - prediction,
            "absolute_error": abs(y.iloc[i] - prediction),
        })

    residuals = pd.DataFrame(residual_rows)
    residuals.to_csv(OUTPUT_DIR / "out_of_fold_predictions.csv", index=False)

    print("\nOut-of-fold evaluation results:")
    print(results.to_string(index=False))

    print("\nModel selection counts across outer folds:")
    print(pd.Series(selected_models).value_counts().to_string())

    print("\nLargest errors for nested model selection:")
    worst = residuals[
        residuals["evaluation"] == "Nested model selection"
    ].nlargest(5, "absolute_error")
    print(worst.to_string(index=False))

    print(f"\nValid observations: {len(df)}")
    print(f"Results saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
