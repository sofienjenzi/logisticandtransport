# Logique de Donnees Realistes

Le fichier `data/logistics_exports.zip` a ete regenere pour eviter des valeurs trop uniformes ou artificielles. Les faits sont maintenant produits par `src/etl/rebalance_realistic_facts.py`, a partir des dimensions existantes.

## Principes metier

- Les pays n'ont pas les memes profils: Allemagne plus performante en service, France intermediaire, Espagne plus sous tension.
- Les categories produits ont des comportements differents:
  - Food: volume eleve, marge plus faible, risque de stock plus fort.
  - FMCG: volume stable, marge moyenne.
  - NonFood: volume plus faible, marge plus elevee.
- Les segments clients influencent la demande, les remises et les attentes de service.
- Les fournisseurs les plus fiables generent moins de retard achat.
- La difficulte des routes, l'experience chauffeur et la performance transporteur influencent les retards livraison.
- Les modes transport ne sont plus uniquement routiers: Road, Rail, Air et Maritime existent dans `fact_transport`.
- L'age et le kilometrage vehicule influencent les pannes, la maintenance et l'immobilisation.
- La satisfaction client depend du retard, des ruptures, des incidents, des retours et du niveau de service.

## Resultat attendu

Les distributions sont volontairement diversifiees:

- Marges: `Loss`, `Low`, `Medium`, `High`.
- Stock: `Healthy`, `Below Safety`, `Overstock`, `Out of Stock`.
- Transport: `Road`, `Rail`, `Air`, `Maritime`.
- Livraison: `On Time`, `Minor Delay`, `Moderate Delay`, `Severe Delay`.
- Satisfaction: `Promoter`, `Passive`, `Detractor`.
- Incidents: `Low`, `Medium`, `High`.

## Commandes utiles

Regenerer les faits realistes et le ZIP:

```bash
python src/etl/rebalance_realistic_facts.py
```

Verifier la qualite:

```bash
python src/etl/data_quality.py
```

Les rapports generes sont:

- `data/curated/realistic_generation_report.json`
- `data/curated/quality_report.json`
