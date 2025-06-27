export function classifyExpense(text) {
  if (!text) return 'Divers';
  const lower = text.toLowerCase();
  const categories = [
    { name: 'Carrosserie', keywords: ['carrosserie', 'frein', 'peinture', 'pare-brise'] },
    { name: 'Fournitures de bureau', keywords: ['bureau', 'papier', 'cartouche', 'imprimante'] },
    { name: 'Loyer', keywords: ['loyer', 'bail', 'location'] },
    { name: 'Entretien', keywords: ['entretien', 'maintenance', 'nettoyage'] },
    { name: 'Déplacements', keywords: ['carburant', 'transport', 'péage', 'taxi', 'train'] },
  ];

  for (const cat of categories) {
    for (const k of cat.keywords) {
      if (lower.includes(k)) {
        return cat.name;
      }
    }
  }
  return 'Divers';
}
