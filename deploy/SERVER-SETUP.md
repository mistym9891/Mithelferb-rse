# Serverinstallation – Mithelferbörse

Schritt-für-Schritt-Anleitung für einen frischen Hetzner-Cloud-Server.
Dauer: etwa 45 Minuten.

---

## 1. Server bestellen

Bei <https://console.hetzner.cloud> ein Projekt anlegen und einen Server erstellen:

| Einstellung   | Wert                                            |
|---------------|-------------------------------------------------|
| Standort      | **Nürnberg** oder **Falkenstein** (Deutschland)  |
| Image         | Ubuntu 24.04 LTS                                 |
| Typ           | **CX22** (2 vCPU, 4 GB RAM, 40 GB) – reicht für alle sieben Ringe |
| Netzwerk      | IPv4 + IPv6                                      |
| SSH-Key       | eigenen Schlüssel hinterlegen (kein Passwort-Login) |
| Backups       | **aktivieren** (+20 % Aufpreis, tägliche Snapshots) |

Zusätzlich im Hetzner-Konto den **Auftragsverarbeitungsvertrag (AVV/DPA)**
abschließen: Konto → Rechtliches → Auftragsverarbeitung. Ohne diesen Vertrag
ist der Betrieb datenschutzrechtlich nicht zulässig.

## 2. DNS eintragen

Beim Domainanbieter einen A-Record (und AAAA-Record für IPv6) auf die
Server-IP setzen, z. B.:

```
mithelfer.maschinenring-sha.de.   A     <IPv4 des Servers>
mithelfer.maschinenring-sha.de.   AAAA  <IPv6 des Servers>
```

Erst weitermachen, wenn `ping mithelfer.…` die Server-IP zeigt – Caddy holt
das TLS-Zertifikat sonst nicht.

## 3. Grundabsicherung

```bash
ssh root@<server-ip>

apt update && apt upgrade -y
apt install -y ufw fail2ban unattended-upgrades git

# Automatische Sicherheitsupdates
dpkg-reconfigure -plow unattended-upgrades

# Firewall: nur SSH und Web
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

systemctl enable --now fail2ban

# Zeitzone
timedatectl set-timezone Europe/Berlin
```

## 4. Docker installieren

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version && docker compose version
```

## 5. Anwendung einrichten

```bash
mkdir -p /opt/mithelferboerse && cd /opt/mithelferboerse
# Projektdateien hierher kopieren (git clone oder scp)

cp .env.prod.example .env
nano .env          # Werte eintragen, siehe unten
chmod +x deploy/backup.sh
```

In `.env` **unbedingt** setzen:

* `APP_DOMAIN` – die Domain aus Schritt 2
* `DB_PASSWORD` – langes Zufallspasswort: `openssl rand -base64 32`
* `JWT_SECRET`  – langes Zufallspasswort: `openssl rand -base64 48`

## 6. Starten

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Caddy holt das Zertifikat automatisch. Nach etwa einer Minute ist
`https://<APP_DOMAIN>` erreichbar.

## 7. Datenbank befüllen

```bash
cd /opt/mithelferboerse

# Excel-Dateien nach backend/data/ legen:
#   Locations.xlsx  (Ortsliste)   und   Staff.xlsx (Mitarbeiter)

docker compose -f docker-compose.prod.yml exec backend npm run seed
docker compose -f docker-compose.prod.yml exec backend npm run geocode
docker compose -f docker-compose.prod.yml exec backend npm run gemeinden
docker compose -f docker-compose.prod.yml exec backend npm run boundaries
docker compose -f docker-compose.prod.yml exec backend npm run import-staff
```

Für `npm run gemeinden` muss der BKG-Datensatz vorhanden sein:

```bash
mkdir -p backend/data/vg250 && cd backend/data/vg250
curl -L -C - -o vg250.zip \
  https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/vg250_01-01.utm32s.shape.ebenen.zip
unzip -o vg250.zip && cd /opt/mithelferboerse
```

## 8. Erstes Konto absichern

Das Seed-Skript legt `admin@example.com` mit dem Passwort `admin123` an.
**Sofort ändern:**

1. Anmelden, Passwort über die Kontoeinstellungen ändern.
2. Unter *Verwaltung* die echten Ring-Administratoren anlegen.
3. Das Demokonto `admin@example.com` löschen oder auf die echte
   E-Mail-Adresse der Super-Administration umstellen.

## 9. Laufender Betrieb

```bash
# Zustand
docker compose -f docker-compose.prod.yml ps
curl -s https://<APP_DOMAIN>/api/../health   # bzw. im Container

# Logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f web

# Aktualisierung einspielen
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Sicherung einspielen
gunzip -c backups/mithelfer_2026-01-15_0230.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U <DB_USER> -d <DB_NAME>
```

## 10. Sicherungen an einen zweiten Ort

Die täglichen Dumps liegen unter `/opt/mithelferboerse/backups`. Sie müssen
zusätzlich vom Server weg gesichert werden – dafür eignet sich der bereits
vorhandene **IONOS HiDrive** (WebDAV):

```bash
apt install -y rclone
rclone config     # Typ "webdav", URL https://webdav.hidrive.ionos.com/
cat >/etc/cron.daily/mithelfer-offsite <<'EOF'
#!/bin/sh
rclone sync /opt/mithelferboerse/backups hidrive:mithelfer-backups --max-age 40d
EOF
chmod +x /etc/cron.daily/mithelfer-offsite
```

## 11. Erreichbarkeit überwachen

Kostenlose Überwachung einrichten, damit ein Ausfall auffällt, z. B.
UptimeRobot oder Hetzner-eigene Benachrichtigungen. Zu prüfende Adresse:

```
https://<APP_DOMAIN>/health
```

Antwortet mit `{"status":"OK","db":"OK"}`.
