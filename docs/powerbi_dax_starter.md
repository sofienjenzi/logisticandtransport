# Power BI DAX Starter

Utilise d'abord:

1. [powerbi_model_calculated_tables.dax](powerbi_model_calculated_tables.dax)
2. [powerbi_measures.dax](powerbi_measures.dax)

## Regle importante pour les visuels 100%

Pour un camembert/donut, utilise une mesure de volume:

- NPS: `NPS Class Lines`
- Satisfaction bands: `Satisfaction Band Lines`
- Stock status: `Stock Status Lines`
- Delay category: `Delay Category Lines`
- Transport mode: `Transport Mode Lines`
- Fill rate band: `Fill Band Lines`
- Attendance status: `Attendance Status Lines`
- Incident severity: `Incident Severity Lines`

Ajoute la mesure `... Share %` en tooltip si tu veux afficher le pourcentage.

Ne mets pas un taux metier comme `Promoter Rate %` ou `On Time Rate %` comme valeur d'un camembert avec une legende: ce n'est pas une repartition additive.

## Mesures essentielles

```DAX
Total Revenue = SUM(fact_sales[revenue_amount])

Total Margin = SUM(fact_sales[margin_amount])

Margin % = DIVIDE([Total Margin], [Total Revenue])

Delivery Count = COUNTROWS(fact_delivery)

On Time Deliveries =
CALCULATE(
    [Delivery Count],
    fact_delivery[delivered_on_time_flag] = 1
)

On Time Rate % = DIVIDE([On Time Deliveries], [Delivery Count])

Stock Lines = COUNTROWS(fact_stock)

Stockout Count =
CALCULATE(
    [Stock Lines],
    fact_stock[stockout_flag] = 1
)

Stockout Rate % = DIVIDE([Stockout Count], [Stock Lines])
```

## Exemple correct pour un donut NPS

Legende:

```DAX
fact_customer_satisfaction[nps_class]
```

Valeur:

```DAX
NPS Class Lines = COUNTROWS(fact_customer_satisfaction)
```

Tooltip:

```DAX
NPS Class Share % =
DIVIDE(
    [NPS Class Lines],
    CALCULATE(
        [NPS Class Lines],
        ALLSELECTED(fact_customer_satisfaction[nps_class])
    )
)
```

## Time intelligence

La table `dim_date` contient une ligne par date et par pays. Pour utiliser `SAMEPERIODLASTYEAR`, `TOTALYTD` et les moyennes mobiles, cree `dim_calendar` depuis [powerbi_model_calculated_tables.dax](powerbi_model_calculated_tables.dax), puis marque `dim_calendar` comme table de dates.
