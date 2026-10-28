
import csv
import sys
from datetime import date
from pathlib import Path

REQUIRED_COLUMNS = {
    "session_id",
    "participant_id",
    "observation_date",
    "activity_type",
    "work_minutes",
    "break_minutes",
    "interruption_count",
    "pending_task_minutes",
    "task_difficulty",
    "sleep_hours",
    "fatigue_rating",
}

NON_NEGATIVE_INTEGER_FIELDS = [
    "work_minutes",
    "break_minutes",
    "interruption_count",
    "pending_task_minutes",
]

ALLOWED_ACTIVITIES = {
    "studying",
    "office_work",
    "programming",
    "research",
    "other",
}


def validate_file(file_path: Path) -> bool:
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}")
        return False

    errors = []
    session_ids = set()
    participant_ids = set()
    row_count = 0

    with file_path.open(
        "r", newline="", encoding="utf-8-sig"
    ) as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames:
            print("ERROR: CSV has no header.")
            return False

        missing = REQUIRED_COLUMNS - set(reader.fieldnames)

        if missing:
            print("ERROR: Missing columns:", ", ".join(sorted(missing)))
            return False

        for row_number, row in enumerate(reader, start=2):
            if not any((value or "").strip() for value in row.values()):
                continue

            row_count += 1

            def error(message):
                errors.append(f"Row {row_number}: {message}")

            # Required identifiers and categories
            for field in (
                "session_id",
                "participant_id",
                "observation_date",
                "activity_type",
                "fatigue_rating",
            ):
                if not (row.get(field) or "").strip():
                    error(f"{field} is required.")

            session_id = (row.get("session_id") or "").strip()
            participant_id = (row.get("participant_id") or "").strip()

            if session_id:
                if session_id in session_ids:
                    error(f"Duplicate session_id: {session_id}")
                session_ids.add(session_id)

            if participant_id:
                participant_ids.add(participant_id)

            # Dates must use YYYY-MM-DD.
            try:
                date.fromisoformat(row["observation_date"].strip())
            except (ValueError, AttributeError):
                error("observation_date must use YYYY-MM-DD.")

            activity = (row.get("activity_type") or "").strip().lower()
            if activity and activity not in ALLOWED_ACTIVITIES:
                error(
                    "activity_type must be one of: "
                    + ", ".join(sorted(ALLOWED_ACTIVITIES))
                )

            # Durations and counts must be non-negative integers.
            for field in NON_NEGATIVE_INTEGER_FIELDS:
                value = (row.get(field) or "").strip()
                try:
                    number = int(value)
                    if number < 0:
                        error(f"{field} cannot be negative.")
                except ValueError:
                    error(f"{field} must be a whole number.")

            # Task difficulty: integer from 1 to 5.
            try:
                difficulty = int(row["task_difficulty"])
                if difficulty not in range(1, 6):
                    error("task_difficulty must be from 1 to 5.")
            except (ValueError, TypeError):
                error("task_difficulty must be an integer from 1 to 5.")

            # Sleep is optional; if supplied, it must be between 0 and 24.
            sleep = (row.get("sleep_hours") or "").strip()
            if sleep:
                try:
                    hours = float(sleep)
                    if not 0 <= hours <= 24:
                        error("sleep_hours must be between 0 and 24.")
                except ValueError:
                    error("sleep_hours must be numeric.")

            # Prediction target: integer from 0 to 10.
            try:
                fatigue = int(row["fatigue_rating"])
                if fatigue not in range(0, 11):
                    error("fatigue_rating must be an integer from 0 to 10.")
            except (ValueError, TypeError):
                error("fatigue_rating must be an integer from 0 to 10.")

    if row_count == 0:
        print("No observations found. The template is ready for data.")
        return True

    if errors:
        print(f"Validation failed with {len(errors)} error(s):")
        for message in errors:
            print(" -", message)
        return False

    print("Dataset validation passed.")
    print(f"Observations: {row_count}")
    print(f"Unique participants: {len(participant_ids)}")
    print("No duplicate session IDs or invalid field values found.")
    print("Note: validation does not establish data quality or model validity.")
    return True


if __name__ == "__main__":
    path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("data/fatigue_survey_template.csv")
    )

    sys.exit(0 if validate_file(path) else 1)
