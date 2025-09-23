import json

with open('dati.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for record in data['dati']:
    record['competenza_completa'] = record['competenza']

with open('dati.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)