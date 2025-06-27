import { jsPDF } from 'jspdf';

/**
 * Generate PDF for cession de créance with legal footer
 */
const CessionPDF = async (cession, company) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CESSION DE CRÉANCE', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  let y = 40;

  // Cedant (repairer) information
  const cedantStartY = y;
  doc.setFont('helvetica', 'bold');
  doc.text('CÉDANT :', 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  if (company.name) { doc.text(company.name, 20, y); y += 6; }
  if (company.address) {
    company.address.split('\n').forEach(line => { doc.text(line, 20, y); y += 6; });
  }
  if (company.siret) { doc.text(`SIRET ${company.siret}`, 20, y); y += 6; }
  if (company.rcs) { doc.text(`RCS ${company.rcs}`, 20, y); y += 6; }
  if (company.vat_number) { doc.text(`TVA ${company.vat_number}`, 20, y); y += 6; }
  const cedantEndY = y;
  doc.rect(18, cedantStartY - 4, 174, cedantEndY - cedantStartY + 8);

  // Debiteur cede (client) information
  const debtorStartY = y;
  doc.setFont('helvetica', 'bold');
  doc.text('DÉBITEUR CÉDÉ :', 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(cession.recipient_name, 20, y); y += 6;
  if (cession.recipient_address) {
    cession.recipient_address.split('\n').forEach(line => { doc.text(line, 20, y); y += 6; });
  }
  const debtorEndY = y;
  doc.rect(18, debtorStartY - 4, 174, debtorEndY - debtorStartY + 8);

  doc.text(`Montant : ${cession.amount.toFixed(2)} €`, 20, y); y += 10;

  // Legal block inserted before signatures
  doc.setFontSize(8);
  const legalParagraphs = [
    'Mentions légales complémentaires :',
    "La présente cession de créance est régie par les articles 1321 à 1326 du Code civil. Elle transfère au réparateur automobile (ci-après désigné \xAB le cédant \xBB) l'intégralité de la créance détenue à l'encontre de l’assureur ou du client (ci-après désigné \xAB le débiteur cédé \xBB), au titre des réparations réalisées sur le véhicule mentionné ci-dessus.",
    "Conformément à l’article L.211-5 du Code des assurances, le client dispose du droit de choisir librement le réparateur de son véhicule. Aucun assureur ne peut imposer un professionnel agréé.",
    "En vertu de l’article L.121-12 du Code des assurances, la subrogation de l’assureur n’exclut pas la cession de créance au bénéfice du réparateur. Cette dernière permet à l’artisan carrossier d’être réglé directement pour les prestations réalisées.",
    "Le client reconnaît que la créance cédée est certaine, liquide et exigible. Il accepte que le paiement soit effectué exclusivement entre les mains du cessionnaire.",
    "Les travaux réalisés sont conformes aux normes professionnelles en vigueur, notamment aux dispositions des articles R.321-1 à R.321-16 du Code de la route concernant la sécurité des réparations automobiles.",
    "La présente cession devient opposable à l’assureur dès sa signature ou dès sa notification par tout moyen conférant date certaine, conformément à l’article 1324 du Code civil. Elle emporte transfert de tous les droits accessoires (intérêts, pénalités, frais de recouvrement éventuels…).",
    'Garantie du cédant :',
    "Le réparateur certifie que la créance n’a fait l’objet d’aucune cession préalable, qu’aucun litige n’est en cours, et que les prestations ont été effectuées conformément au devis validé.",
    'Clause de non-recours :',
    "Le débiteur renonce à tout recours concernant la somme mentionnée dans cet acte. Sa signature vaut accord irrévocable et reconnaissance de dette, en application de l’article 1367 du Code civil relatif à la validité des signatures électroniques."
  ];

  legalParagraphs.forEach(p => {
    const lines = doc.splitTextToSize(p, 170);
    lines.forEach(line => { doc.text(line, 20, y); y += 3.5; });
    y += 1.5;
  });

  doc.setFontSize(10);

  doc.text('Signature du client :', 20, y);
  if (cession.client_signature_url) {
    const img = new Image();
    img.src = cession.client_signature_url;
    await new Promise((res) => { img.onload = res; });
    doc.addImage(img, 'PNG', 20, y + 2, 60, 20);
  }

  doc.text('Signature du carrossier :', 120, y);
  if (cession.dealer_signature_url) {
    const img2 = new Image();
    img2.src = cession.dealer_signature_url;
    await new Promise((res) => { img2.onload = res; });
    doc.addImage(img2, 'PNG', 120, y + 2, 60, 20);
  }

  doc.setFontSize(8);
  doc.text('La présente cession de créance est régie par les articles 1321 à 1326 du Code civil. Les signatures électroniques engagent les parties conformément à l\'article 1367 du Code civil.', 105, 270, { align: 'center', maxWidth: 170 });
  doc.text('Document généré avec AutoCoreAI – www.autocoreai.com', 105, 285, { align: 'center' });

  doc.save(`cession_${cession.id}.pdf`);
};

export default CessionPDF;
