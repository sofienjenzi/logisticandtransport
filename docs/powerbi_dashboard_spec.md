# Specification Power BI Professionnelle - Logistics Analytics

Source officielle: `data/logistics_exports.zip`.

Objectif: construire un rapport Power BI avec une page par domaine metier, des filtres adaptes au besoin de chaque page, des mesures DAX avancees, des jauges colorees, des diagrammes empiles, des cartes KPI, des repartitions type camembert/donut et des vues geographiques par pays.

## Modele de donnees

Importer tous les CSV du ZIP dans Power BI Desktop. Le modele doit rester en etoile: les dimensions filtrent les tables de faits via les colonnes `sk_*`.

Relations principales:

- `fact_sales` -> `dim_date`, `dim_client`, `dim_product`, `dim_order`
- `fact_purchase` -> `dim_date`, `dim_supplier`, `dim_product`, `dim_order`
- `fact_stock` -> `dim_date`, `dim_product`, `dim_warehouse`
- `fact_delivery` -> `dim_date`, `dim_order`, `dim_driver`, `dim_vehicle`, `dim_route`, `dim_client`
- `fact_transport` -> `dim_date`, `dim_route`, `dim_vehicle`, `dim_driver`, `dim_carrier`, `dim_transport_mode`
- `fact_maintenance` -> `dim_date`, `dim_vehicle`
- `fact_fuel` -> `dim_date`, `dim_vehicle`
- `fact_driver_presence` -> `dim_date`, `dim_driver`
- `fact_incident` -> `dim_date`, `dim_incident`, `dim_driver`, `dim_vehicle`, `dim_route`
- `fact_customer_satisfaction` -> `dim_date`, `dim_client`, `dim_order`

Reglages Power BI:

- Convertir `dim_date[full_date]` en type Date.
- Trier `dim_date[year_month]` par `dim_date[month_sort_key]`.
- Marquer `dim_date` comme table de dates.
- Mettre les relations en sens unique dimension -> fait.
- Creer une table vide `_Measures` pour centraliser les mesures.
- Creer d'abord les objets de [docs/powerbi_model_calculated_tables.dax](docs/powerbi_model_calculated_tables.dax).
- Importer les mesures de `docs/powerbi_measures.dax`.

Regle importante pour les camemberts/donuts:

- Un camembert doit representer une repartition a 100%.
- Utiliser une mesure de volume dans `Values`: par exemple `NPS Class Lines`, `Stock Status Lines`, `Delay Category Lines`, `Transport Mode Lines`.
- Pour afficher un pourcentage explicite, utiliser les mesures `... Share %`.
- Ne pas utiliser un taux metier comme `Promoter Rate %`, `On Time Rate %`, `Stockout Rate %` directement en valeur de camembert avec une legende, car le contexte de la legende peut fausser la lecture.

## Navigation

Creer une barre de boutons sur chaque page:

Executif | Ventes | Achats | Stocks | Livraisons | Transport | Vehicules | RH | Incidents | Satisfaction

Chaque bouton utilise l'action Power BI `Page navigation`.

## Theme visuel

- Fond: gris tres clair.
- Cartes KPI: blanc, bordure fine, accent colore a gauche.
- Vert: performance saine.
- Orange: attention.
- Rouge: risque.
- Bleu: service/volume.
- Les jauges doivent changer de couleur via les mesures `... Color`.

## Dashboards et choix metier

### 1. Dashboard Executif

Besoin: donner une lecture rapide de la sante globale de l'entreprise.

Filtres:

- Pays: `dim_date[country_code]`
- Annee: `dim_date[year_num]`
- Segment marge: `fact_sales[margin_band]`
- Classe NPS: `fact_customer_satisfaction[nps_class]`

Visuels:

- Cards: `Total Revenue`, `Margin %`, `On Time Rate %`, `Stockout Rate %`, `Average Satisfaction Score`.
- Jauge: `On Time Rate %` avec cible `Delivery Target %`.
- Courbe/aire: `Total Revenue` et `Total Margin` par `year_month`.
- Barres groupees geographiques: `Total Revenue` et `Transport Cost` par pays.
- Barres empilees: nombre de livraisons par pays et `delay_category`.
- Donut: legende `fact_customer_satisfaction[nps_class]`, valeur `NPS Class Lines`, tooltip `NPS Class Share %`.
- Carte KPI texte: `Executive Health` avec couleur `Executive Health Color`.

### 2. Dashboard Ventes

Besoin: comprendre clients, produits, canaux et qualite de marge.

Filtres:

- Pays
- Annee
- Client: `dim_client[client_name]`
- Produit: `dim_product[product_name]`
- Canal: `dim_order[sales_channel]`
- Segment marge: `fact_sales[margin_band]`

Visuels:

- Cards: `Total Revenue`, `Total Margin`, `Margin %`, `Sales Lines`.
- Barres horizontales: top 10 clients par `Total Revenue`.
- Diagramme combine barres: `Total Revenue` et `Total Margin` par produit.
- Donut: legende `dim_order[sales_channel]`, valeur `Sales Channel Lines`, tooltip `Sales Channel Share %`.
- Barres: axe `fact_sales[margin_band]`, valeur `Margin Band Lines`, tooltip `Margin Band Share %`.
- Carte geographique ou barres pays: `Total Revenue` par pays.
- Tableau detail: client, CA, marge %, `Revenue Rank Client`, `Top Client Flag`.

### 3. Dashboard Achats

Besoin: piloter fournisseurs, couts et respect des delais.

Filtres:

- Pays
- Annee
- Fournisseur: `dim_supplier[supplier_name]`
- Produit
- Etat delai: colonne calculee `Purchase Delay Class`

Visuels:

- Cards: `Purchase Amount`, `Average Real Purchase Delay`, `Average Purchase Delay Gap`, `Purchase On Time Rate %`.
- Jauge: `Purchase On Time Rate %`.
- Barres horizontales: top fournisseurs par `Purchase Amount`.
- Barres: cout achat par produit.
- Donut: legende `fact_purchase[Purchase Delay Class]`, valeur `Purchase Delay Class Lines`, tooltip `Purchase Delay Class Share %`.
- Barres: `Purchase Amount` par pays.
- Tableau: fournisseur, `Purchase Amount`, `Average Purchase Delay Gap`, `Purchase Delay Status`, `Supplier Rank by Cost`.

### 4. Dashboard Stocks

Besoin: identifier les risques de rupture et la valeur immobilisee.

Filtres:

- Pays
- Annee
- Entrepot: `dim_warehouse[warehouse_name]`
- Produit
- Statut stock: `fact_stock[stock_status]`

Visuels:

- Cards: `Stock Value`, `Stockout Rate %`, `Stock Gap Units`, `Stock Coverage Index`.
- Jauge: `Stock Availability %`.
- Donut: legende `fact_stock[stock_status]`, valeur `Stock Status Lines`, tooltip `Stock Status Share %`.
- Barres horizontales: valeur stock par entrepot.
- Barres: valeur stock par produit.
- Barres geographiques: `Stockout Count` par pays.
- KPI texte: `Stock Risk Status` avec `Stock Risk Color`.

### 5. Dashboard Livraisons

Besoin: evaluer le service client et les causes de retard.

Filtres:

- Pays
- Annee
- Client
- Chauffeur: `dim_driver[first_name]` + `dim_driver[last_name]`
- Vehicule
- Categorie retard: `fact_delivery[delay_category]`

Visuels:

- Cards: `Delivery Count`, `On Time Rate %`, `Average Service Rate`, `Average Delay Minutes`.
- Jauge: `On Time Rate %`.
- Barres empilees: axe pays, legende `fact_delivery[delay_category]`, valeur `Delay Category Lines`.
- Courbe: `Average Service Rate` par mois.
- Barres horizontales: clients avec plus faible `On Time Rate %`.
- Barres horizontales: chauffeurs par `On Time Rate %`.
- KPI texte: `Delivery Status`.

### 6. Dashboard Transport

Besoin: optimiser cout, remplissage, transporteurs, routes et CO2.

Filtres:

- Pays
- Annee
- Route: `dim_route[route_code]`
- Transporteur: `dim_carrier[carrier_name]`
- Mode: `dim_transport_mode[transport_mode]`
- Remplissage: `fact_transport[fill_rate_band]`

Visuels:

- Cards: `Transport Cost`, `Distance Km`, `Cost per Km`, `Average Fill Rate`, `CO2 Kg`.
- Jauge: `Average Fill Rate`.
- Nuage de points: `distance_km` vs `transport_cost_per_km`.
- Barres horizontales: cout par transporteur.
- Donut: legende `fact_transport[fill_rate_band]`, valeur `Fill Band Lines`, tooltip `Fill Band Share %`.
- Barres geographiques: `CO2 Kg` par pays.
- Tableau: route, cout, distance, cout/km, CO2/km, `Carrier Cost Rank`.

### 7. Dashboard Vehicules

Besoin: suivre le cout total de possession, la fiabilite et l'immobilisation.

Filtres:

- Pays
- Annee
- Vehicule: `dim_vehicle[vehicle_id]`
- Type vehicule: `dim_vehicle[vehicle_type]`
- Statut vehicule: `dim_vehicle[status]`

Visuels:

- Cards: `Maintenance Cost`, `Fuel Cost`, `Vehicle TCO`, `Breakdown Rate %`, `Immobilization Hours`.
- Jauge: `Fleet Reliability %`.
- Barres horizontales: maintenance par vehicule.
- Barres: carburant par vehicule.
- Donut: legende `dim_vehicle[vehicle_type]`, valeur `Vehicle TCO`, tooltip `Vehicle Type TCO Share %`.
- Barres horizontales: immobilisation par vehicule.
- Tableau: vehicule, TCO, consommation, pannes, `Vehicle TCO Rank`.

### 8. Dashboard RH Chauffeurs

Besoin: surveiller presence, retards et capacite chauffeurs.

Filtres:

- Pays
- Annee
- Chauffeur
- Statut presence: `fact_driver_presence[attendance_status]`
- Experience: colonne calculee `Driver Experience Band`

Visuels:

- Cards: `Worked Hours`, `Presence Rate %`, `Late Presence Rate %`, `Absence Rate %`.
- Jauge: `Presence Rate %`.
- Camembert: legende `fact_driver_presence[attendance_status]`, valeur `Attendance Status Lines`, tooltip `Attendance Status Share %`.
- Barres: heures travaillees par pays.
- Barres horizontales: chauffeurs avec plus fort `Late Presence Rate %`.
- Histogramme: chauffeurs par bande d'experience.
- KPI texte: `HR Status`.

### 9. Dashboard Incidents

Besoin: controler le risque operationnel et le cout des incidents.

Filtres:

- Pays
- Annee
- Gravite: `fact_incident[severity_band]`
- Type incident: `dim_incident[incident_type]`
- Route
- Vehicule

Visuels:

- Cards: `Incident Count`, `Incident Cost`, `Average Resolution Hours`, `Accident Rate %`, `Average Severity Score`.
- Jauge: part sans accident = `1 - Accident Rate %`.
- Donut: legende `fact_incident[severity_band]`, valeur `Incident Severity Lines`, tooltip `Incident Severity Share %`.
- Barres empilees: gravite par pays.
- Barres horizontales: cout par type incident.
- Barres: temps moyen de resolution par gravite.
- KPI texte: `Incident Risk Status`.

### 10. Dashboard Satisfaction

Besoin: comprendre experience client, NPS et reclamations.

Filtres:

- Pays
- Annee
- Client
- Classe NPS: `fact_customer_satisfaction[nps_class]`
- Segment satisfaction: `fact_customer_satisfaction[satisfaction_band]`

Visuels:

- Cards: `Average Satisfaction Score`, `Complaint Rate %`, `NPS Score`, `Promoter Rate %`, `Satisfaction Responses`.
- Jauge: `Average Satisfaction Score` avec cible `Satisfaction Target Score`.
- Camembert: legende `fact_customer_satisfaction[nps_class]`, valeur `NPS Class Lines`, tooltip `NPS Class Share %`.
- Donut: legende `fact_customer_satisfaction[satisfaction_band]`, valeur `Satisfaction Band Lines`, tooltip `Satisfaction Band Share %`.
- Barres geographiques: score moyen par pays.
- Barres horizontales: clients avec plus fort `Complaint Rate %`.
- KPI texte: `Customer Experience Status`.

## DAX avance

Le fichier `docs/powerbi_measures.dax` contient:

- Mesures de base finance, achats, stock, livraison, transport, flotte, RH, incidents et satisfaction.
- Mesures temporelles: previous year, YoY %, moving average.
- Mesures de rang: clients, fournisseurs, transporteurs, vehicules.
- Mesures de statut avec `SWITCH(TRUE())`.
- Couleurs dynamiques pour KPI et jauges.
- Mesures `... Share %` dediees aux camemberts/donuts afin de respecter une repartition a 100%.
- Colonnes calculees de classification dans `docs/powerbi_model_calculated_tables.dax`: delai achat, experience chauffeur, SLA livraison, cout/km transport.
- Score composite executif.

## Recommandations de finition

- Utiliser les tooltips Power BI pour afficher les mesures secondaires.
- Ajouter une page tooltip dediee pour les clients et une autre pour les vehicules.
- Mettre les filtres sous forme de slicers compacts horizontaux.
- Synchroniser uniquement les filtres utiles entre pages; ne pas synchroniser client/produit partout.
- Afficher les statuts couleur dans les cartes KPI avec formatage conditionnel.
