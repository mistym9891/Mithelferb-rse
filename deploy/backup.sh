#!/bin/bash
# Tägliche Sicherung der Datenbank.
#
# Läuft als eigener Container in einer Endlosschleife und legt jede Nacht um
# 02:30 Uhr (Europe/Berlin) einen komprimierten Dump unter ./backups ab.
# Sicherungen, die älter als RETENTION_DAYS sind, werden gelöscht.
#
# WICHTIG: Diese Sicherungen liegen auf demselben Server. Für den Ernstfall
# müssen sie zusätzlich an einen anderen Ort kopiert werden – etwa auf den
# vorhandenen IONOS-HiDrive-Speicher (siehe README, Abschnitt Hosting).

set -uo pipefail

BACKUP_DIR=/backups
RETENTION_DAYS=${RETENTION_DAYS:-30}
BACKUP_HOUR=${BACKUP_HOUR:-02}
BACKUP_MINUTE=${BACKUP_MINUTE:-30}

mkdir -p "$BACKUP_DIR"

run_backup() {
  local stamp file
  stamp=$(date +%Y-%m-%d_%H%M)
  file="$BACKUP_DIR/mithelfer_${stamp}.sql.gz"

  echo "[$(date '+%F %T')] Sicherung nach $file"
  if pg_dump -h db -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$file"; then
    echo "[$(date '+%F %T')] Sicherung erfolgreich ($(du -h "$file" | cut -f1))"
  else
    echo "[$(date '+%F %T')] FEHLER: Sicherung fehlgeschlagen" >&2
    rm -f "$file"
    return 1
  fi

  # Alte Sicherungen entfernen
  find "$BACKUP_DIR" -name 'mithelfer_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
  echo "[$(date '+%F %T')] Vorhandene Sicherungen: $(ls -1 "$BACKUP_DIR"/mithelfer_*.sql.gz 2>/dev/null | wc -l)"
}

# Beim Start einmal sichern, damit sofort ein Stand vorliegt.
sleep 30
run_backup || true

while true; do
  now_h=$(date +%H)
  now_m=$(date +%M)
  if [ "$now_h" = "$BACKUP_HOUR" ] && [ "$now_m" = "$BACKUP_MINUTE" ]; then
    run_backup || true
    sleep 60
  fi
  sleep 30
done
