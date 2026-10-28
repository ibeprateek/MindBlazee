
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

FEATURE_SETS = {
    "Full features": NUMERIC_FEATURES + CATEGORICAL_FEATURES,
    "Without activity type": NUMERIC_FEATURES,
}

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


def make_pipeline(estimator, use_activity_type):
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    transformers = [
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
    ]

    if use_activity_type:
        categorical_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ])
        transformers.append(
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES)
        )

    preprocessor = ColumnTransformer(transformers=transformers)

    return Pipeline([
        ("preprocessor", preprocessor),
        ("model", estimator),
    ])


def calculate_metrics(y_true, y_pred):
    return {
        "MAE": mean_absolute_error(y_true, y_pred),
        "RMSE": mean_squared_error(y_true, y_pred) ** 0.5,
        "R2": r2_score(y_true, y_pred),
    }


def main():
    df = pd.read_csv(DATA_PATH)

    required = [TARGET] + NUMERIC_FEATURES + CATEGORICAL_FEATURES
    missing = [column for column in required if column not in df.columns]

    if missing:
        raise ValueError(f"Missing columns: {missing}")

    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    df = df.dropna(subset=[TARGET])
    df = df[df[TARGET].between(0, 10)].reset_index(drop=True)

    for column in NUMERIC_FEATURES:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    if len(df) < 25:
        raise ValueError(f"Only {len(df)} valid observations found.")

    y = df[TARGET].astype(float)

    # Identical outer folds for both feature sets.
    outer_cv = KFold(n_splits=5, shuffle=True, random_state=2026)

    metric_rows = []
    prediction_rows = []

    for feature_set_name, columns in FEATURE_SETS.items():
        use_activity_type = "activity_type" in columns
        X = df[columns].copy()

        oof_predictions = {
            model_name: np.full(len(df), np.nan)
            for model_name in MODELS
        }
        nested_predictions = np.full(len(df), np.nan)
        selected_models = []

        print(f"\n{'=' * 60}")
        print(f"Experiment: {feature_set_name}")
        print(f"{'=' * 60}")

        for fold, (train_idx, test_idx) in enumerate(
            outer_cv.split(X), start=1
        ):
            X_train = X.iloc[train_idx]
            X_test = X.iloc[test_idx]
            y_train = y.iloc[train_idx]
            y_test = y.iloc[test_idx]

            # Evaluate each fixed model on the same held-out fold.
            for model_name, estimator in MODELS.items():
                pipeline = make_pipeline(estimator, use_activity_type)
                pipeline.fit(X_train, y_train)
                oof_predictions[model_name][test_idx] = (
                    pipeline.predict(X_test)
                )

            # Select a model using only this outer training fold.
            inner_cv = KFold(
                n_splits=4,
                shuffle=True,
                random_state=1000 + fold,
            )

            inner_scores = {}

            for model_name, estimator in MODELS.items():
                scores = cross_val_score(
                    make_pipeline(estimator, use_activity_type),
                    X_train,
                    y_train,
                    cv=inner_cv,
                    scoring="neg_mean_absolute_error",
                )
                inner_scores[model_name] = -scores.mean()

            chosen_name = min(inner_scores, key=inner_scores.get)
            selected_models.append(chosen_name)

            chosen_pipeline = make_pipeline(
                MODELS[chosen_name], use_activity_type
            )
            chosen_pipeline.fit(X_train, y_train)
            nested_predictions[test_idx] = chosen_pipeline.predict(X_test)

            print(
                f"Fold {fold}: selected {chosen_name}; "
                f"held-out participants = {len(test_idx)}"
            )

        # Collect out-of-fold metrics for every fixed model.
        for model_name, predictions in oof_predictions.items():
            row = {
                "feature_set": feature_set_name,
                "evaluation": model_name,
            }
            row.update(calculate_metrics(y, predictions))
            metric_rows.append(row)

            for index, prediction in enumerate(predictions):
                prediction_rows.append({
                    "feature_set": feature_set_name,
                    "evaluation": model_name,
                    "row_index": index,
                    "actual_fatigue": y.iloc[index],
                    "predicted_fatigue": prediction,
                    "residual": y.iloc[index] - prediction,
                    "absolute_error": abs(y.iloc[index] - prediction),
                })

        row = {
            "feature_set": feature_set_name,
            "evaluation": "Nested model selection",
        }
        row.update(calculate_metrics(y, nested_predictions))
        metric_rows.append(row)

        for index, prediction in enumerate(nested_predictions):
            prediction_rows.append({
                "feature_set": feature_set_name,
                "evaluation": "Nested model selection",
                "row_index": index,
                "actual_fatigue": y.iloc[index],
                "predicted_fatigue": prediction,
                "residual": y.iloc[index] - prediction,
                "absolute_error": abs(y.iloc[index] - prediction),
            })

        print("\nModel selection counts:")
        print(pd.Series(selected_models).value_counts().to_string())

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    metrics_df = pd.DataFrame(metric_rows)
    metrics_df[["MAE", "RMSE", "R2"]] = metrics_df[
        ["MAE", "RMSE", "R2"]
    ].round(3)

    metrics_path = OUTPUT_DIR / "feature_set_comparison.csv"
    predictions_path = OUTPUT_DIR / "feature_set_oof_predictions.csv"

    metrics_df.to_csv(metrics_path, index=False)
    pd.DataFrame(prediction_rows).to_csv(predictions_path, index=False)

    print("\nFEATURE-SET COMPARISON")
    print(
        metrics_df.sort_values(["evaluation", "feature_set"])
        .to_string(index=False)
    )

    print("\nFiles saved:")
    print(metrics_path)
    print(predictions_path)
    print(f"\nValid participants: {len(df)}")


if __name__ == "__main__":
    main()
