"""Compatibilité entre les modèles entraînés avec sklearn 1.6.1 et la version actuelle."""

import sklearn.compose._column_transformer as ct


class _RemainderColsList(list):
    """Rétablit la classe _RemainderColsList supprimée dans sklearn > 1.6.1.

    Les modèles joblib sauvegardés avec sklearn 1.6.1 contiennent des références
    à sklearn.compose._column_transformer._RemainderColsList. Cette classe fantôme
    permet le unpickling sans erreur.
    """


# Injecte la classe manquante dans le module qui en a besoin
if not hasattr(ct, "_RemainderColsList"):
    ct._RemainderColsList = _RemainderColsList
    print("[fix_compat] _RemainderColsList rétablie pour compatibilité sklearn 1.6.1 → version actuelle")