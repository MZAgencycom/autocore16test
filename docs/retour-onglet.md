# Retour d'onglet

Lorsque l'utilisateur revient sur l'application après avoir changé d'onglet,
la session Supabase est désormais rafraîchie globalement par `App.jsx`.
Si le rafraîchissement échoue et qu'aucune session n'est retrouvée, un toast
avertit l'utilisateur et une redirection vers l'écran de connexion est
effectuée. Ce comportement s'applique également lors de la création de facture à
partir d'un rapport.

