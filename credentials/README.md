# Informations sur l'authentification Google Document AI

Ce dossier contient les fichiers de clés de service pour l'authentification Google Document AI.

## À propos des clés de service

Les fichiers JSON de compte de service Google contiennent des informations d'identification sensibles qui ne doivent **jamais** être exposées côté client (dans le navigateur).

## Comment utiliser ces clés correctement

1. **ENVIRONNEMENT NAVIGATEUR (Frontend)** : 
   - Les clés de service NE PEUVENT PAS être utilisées directement dans le code exécuté dans le navigateur
   - Une erreur d'authentification se produira si vous essayez d'utiliser ces clés directement

2. **SOLUTION RECOMMANDÉE** :
   - Utiliser l'Edge Function Supabase créée spécifiquement pour Document AI
   - Le frontend enverra les documents à analyser à cette Edge Function
   - L'Edge Function communiquera avec l'API Document AI en utilisant les clés de service et renverra les résultats au frontend

## Exemple d'implémentation sécurisée

```javascript
// Dans le frontend, utilisez cette approche pour envoyer des documents à l'Edge Function:
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-ai`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    base64Content: base64EncodedFile
  })
});

const result = await response.json();
// Utilisez result.data pour accéder aux informations extraites
```

## Configuration de l'Edge Function

L'Edge Function a besoin d'accéder au fichier JSON de compte de service:

1. Définissez la variable d'environnement GOOGLE_APPLICATION_CREDENTIALS dans les paramètres du projet Supabase:
   - Formatez le contenu du fichier JSON en une seule ligne
   - Ajoutez-le comme variable d'environnement dans votre projet Supabase

2. Ou utilisez les secrets de l'Edge Function pour stocker le contenu du fichier JSON:
   ```bash
   supabase secrets set GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account","project_id":"...etc}'
   ```

## Note importante sur la sécurité

Ne jamais exposer ces clés dans le code côté client ou les stocker dans des dépôts publics.