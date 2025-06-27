import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import useCompanySettings from '../../hooks/useCompanySettings';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'react-hot-toast';
import ElectronicSignature from '../../components/loan-vehicles/ElectronicSignature';
import { jsPDF } from 'jspdf';

const CreateCessionCreancePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillClientId = searchParams.get('client') || null;
  const { user } = useAuth();
  const { company } = useCompanySettings();
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);
  const [clientSignature, setClientSignature] = useState(null);
  const [dealerSignature, setDealerSignature] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(null); // 'client' or 'dealer'
  // Initialize due_date with today's date to prevent empty string errors
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_id: '',
    recipient_name: '',
    recipient_email: '',
    recipient_company: '',
    recipient_address: '',
    recipient_phone: '',
    recipient_siret: '',
    recipient_ape_code: '',
    recipient_rcs: '',
    recipient_website: '',
    amount: '',
    notes: '',
    due_date: today, // Default to today's date
  });

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        setCompanySettings(data);
      } catch (e) {
        console.error('Error loading company settings', e);
      }
    };
    fetchCompany();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load clients');
      }
    };

    fetchClients();
  }, []);

  useEffect(() => {
    if (clients.length > 0 && prefillClientId && !formData.client_id) {
      const client = clients.find((c) => c.id === prefillClientId);
      if (client) {
        setFormData((prev) => ({
          ...prev,
          client_id: prefillClientId,
          recipient_name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
          recipient_email: client.email || '',
          recipient_address: client.address || '',
        }));
        fetchInvoicesByClient(prefillClientId);
      }
    }
  }, [clients, prefillClientId]);

  // Prefill dealer information from company settings
  useEffect(() => {
    if (company) {
      setFormData((prev) => ({
        ...prev,
        recipient_company: company.name || prev.recipient_company,
        recipient_address: company.address || prev.recipient_address,
        recipient_phone: company.phone || prev.recipient_phone,
        recipient_siret: company.siret || prev.recipient_siret,
        recipient_ape_code: company.apeCode || prev.recipient_ape_code,
        recipient_rcs: company.rcs || prev.recipient_rcs,
        recipient_website: company.website || prev.recipient_website,
      }));
    }
  }, [company]);

  const fetchInvoicesByClient = async (clientId) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, vehicles(*)')
        .eq('client_id', clientId)
        // Include all invoice statuses so none are missed
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const handleClientChange = (value) => {
    const selected = clients.find((c) => c.id === value);
    setFormData((prev) => ({
      ...prev,
      client_id: value,
      invoice_id: '',
      recipient_name: selected ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim() : '',
      recipient_email: selected?.email || '',
      recipient_address: selected?.address || '',
    }));
    fetchInvoicesByClient(value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleClientSignatureSave = (url) => {
    setClientSignature(url);
    setShowSignatureModal(null);
  };

  const handleDealerSignatureSave = (url) => {
    setDealerSignature(url);
    setShowSignatureModal(null);
  };

  const generatePdf = async (cession, invoice) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header with logo and title
    if (companySettings?.logo_url) {
      const logo = new Image();
      logo.src = companySettings.logo_url;
      await new Promise((res) => { logo.onload = res; });
      doc.addImage(logo, 'PNG', 20, 10, 30, 15);
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CESSION DE CRÉANCE', 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = 45;

    if (invoice?.insurer) {
      doc.text(`Compagnie d'assurance : ${invoice.insurer.name || ''}`, 20, y); y += 6;
      doc.text(`N° de contrat : ${invoice.insurer.policyNumber || ''}`, 20, y); y += 6;
      doc.text(`N° de sinistre : ${invoice.insurer.claimNumber || ''}`, 20, y); y += 6;
    }

    if (invoice?.accident_date) {
      const dateSinistre = new Date(invoice.accident_date).toLocaleDateString('fr-FR');
      doc.text(`Date du sinistre : ${dateSinistre}`, 20, y); y += 6;
    }

    const repairAmount = invoice?.total || cession.invoice_amount || cession.amount;
    doc.text(`Montant TTC des réparations : ${repairAmount.toFixed(2)} €`, 20, y); y += 10;

    // Debiteur cede (client)
    const debtorStartY = y;
    doc.setFont('helvetica', 'bold');
    doc.text('DÉBITEUR CÉDÉ :', 20, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(cession.recipient_name, 20, y); y += 6;
    if (cession.recipient_address) {
      const lines = cession.recipient_address.split('\n');
      lines.forEach((l) => { doc.text(l, 20, y); y += 6; });
    }

    if (invoice?.vehicles) {
      doc.text(`Véhicule : ${invoice.vehicles.make || ''} ${invoice.vehicles.model || ''}`, 20, y); y += 6;
      if (invoice.vehicles.registration) { doc.text(`Immatriculation : ${invoice.vehicles.registration}`, 20, y); y += 6; }
    }
    const debtorEndY = y;
    // Dynamic height with smaller padding to avoid overlapping following text
    doc.rect(18, debtorStartY - 4, 174, debtorEndY - debtorStartY + 6);

    const signDate = cession.signed_at ? new Date(cession.signed_at) : new Date();
    doc.text(`Date de signature : ${signDate.toLocaleDateString('fr-FR')}`, 20, y); y += 10;

    // Cedant (repairer)
    const cedantStartY = y;
    doc.setFont('helvetica', 'bold');
    doc.text('CÉDANT :', 20, y); y += 6;
    doc.setFont('helvetica', 'normal');
    if (companySettings?.company_name) { doc.text(companySettings.company_name, 20, y); y += 6; }
    if (companySettings?.address_street) { doc.text(companySettings.address_street, 20, y); y += 6; }
    const cityLine = `${companySettings?.address_zip_code || ''} ${companySettings?.address_city || ''}`.trim();
    if (cityLine) { doc.text(cityLine, 20, y); y += 6; }
    if (companySettings?.siret) { doc.text(`SIRET ${companySettings.siret}`, 20, y); y += 6; }
    if (companySettings?.rcs_number) {
      const rcsCity = (companySettings.address_city || '').toUpperCase();
      doc.text(`RCS ${rcsCity} ${companySettings.rcs_number}`, 20, y); y += 6;
    }
    if (companySettings?.vat_number) { doc.text(`TVA ${companySettings.vat_number}`, 20, y); y += 10; }
    const cedantEndY = y;
    doc.rect(18, cedantStartY - 4, 174, cedantEndY - cedantStartY + 8);

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

    // Signature areas
    doc.text('Signature du client', 35, y);
    doc.text('Signature du carrossier', 125, y);
    y += 2;

    if (clientSignature) {
      const img = new Image();
      img.src = clientSignature;
      await new Promise((res) => { img.onload = res; });
      doc.addImage(img, 'PNG', 20, y, 60, 20);
    }

    if (dealerSignature) {
      const img2 = new Image();
      img2.src = dealerSignature;
      await new Promise((res) => { img2.onload = res; });
      doc.addImage(img2, 'PNG', 120, y, 60, 20);

      // Professional stamp
      doc.setDrawColor(0, 0, 150);
      doc.setLineWidth(1);
      doc.circle(150, y + 30, 18);
      doc.setLineWidth(0.5);
      doc.circle(150, y + 30, 15);
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 150);
      doc.text((companySettings?.company_name || '').toUpperCase(), 150, y + 25, { align: 'center' });
      if (companySettings?.address_city) {
        doc.text(companySettings.address_city.toUpperCase(), 150, y + 30, { align: 'center' });
      }
      if (companySettings?.siret) {
        doc.text(`SIRET ${companySettings.siret}`, 150, y + 35, { align: 'center' });
      }
      if (companySettings?.rcs_number) {
        doc.text(`RCS ${companySettings.rcs_number}`, 150, y + 40, { align: 'center' });
      }
      if (companySettings?.vat_number) {
        doc.text(`TVA ${companySettings.vat_number}`, 150, y + 45, { align: 'center' });
      }
    }

    // Legal note
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('La présente cession de créance est régie par les articles 1321 à 1326 du Code civil. Les signatures électroniques engagent les parties conformément à l\'article 1367 du Code civil.', 105, 270, { align: 'center', maxWidth: 170 });
    doc.text('Document généré avec AutoCoreAI – www.autocoreai.com', 105, 285, { align: 'center' });

    const blob = doc.output('blob');
    const fileName = `cession_${cession.id}.pdf`;
    const filePath = `cessions/${fileName}`;
    const { error } = await supabase.storage.from('reports').upload(filePath, blob, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(filePath);
      await supabase.from('cession_creances').update({ document_url: publicUrl }).eq('id', cession.id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientToken = crypto.randomUUID();
      const repairerToken = crypto.randomUUID();
      // Get the selected invoice details
      const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id);

      if (!selectedInvoice) {
        throw new Error('Please select a valid invoice');
      }

      if (!clientSignature || !dealerSignature) {
        throw new Error('Les signatures du client et du réparateur sont requises');
      }

      // Check if due_date is valid
      if (!formData.due_date) {
        throw new Error('La date d\'échéance est requise');
      }

      // Format the due_date to ensure it's a valid timestamp
      const formattedDueDate = new Date(formData.due_date).toISOString();

      const { data, error } = await supabase
        .from('cession_creances')
        .insert([
          {
            client_id: formData.client_id,
            invoice_id: formData.invoice_id,
            invoice_number: selectedInvoice.invoice_number,
            invoice_amount: selectedInvoice.total,
            recipient_name: formData.recipient_name,
            recipient_email: formData.recipient_email,
            recipient_company: formData.recipient_company,
            recipient_address: formData.recipient_address,
            amount: parseFloat(formData.amount) || selectedInvoice.total,
            notes: formData.notes,
            status: 'pending',
            due_date: formattedDueDate, // Use the formatted date
            created_by: user.id,
            client_sign_token: clientToken,
            repairer_sign_token: repairerToken,
            client_signature_url: clientSignature,
            dealer_signature_url: dealerSignature
          }
        ])
        .select()
        .single();

      if (error) throw error;

      await generatePdf(data, selectedInvoice);

      toast.success('Cession de créance créée avec succès');
      navigate('/dashboard/cessions');
    } catch (error) {
      console.error('Error creating cession:', error);
      toast.error(error.message || 'Failed to create cession');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Créer une Cession de Créance</h1>

      <div className="bg-muted/50 text-sm rounded-md p-4 mb-6">
        Les informations de votre entreprise ont été remplies automatiquement à partir de vos paramètres AutoCore. Vous pouvez les modifier à tout moment dans l'espace Paramètres.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Cession de Créance</CardTitle>
          <CardDescription>
            Remplissez ce formulaire pour créer une cession de créance pour une facture existante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="client_id">Client</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={handleClientChange} 
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invoice_id">Facture</Label>
                <Select
                  value={formData.invoice_id}
                  onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
                  disabled={!formData.client_id || invoices.length === 0}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez une facture" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - {invoice.total.toFixed(2)}€
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.client_id && invoices.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Ce client n'a pas de factures envoyées disponibles pour cession
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditUnlocked((v) => !v)}
                >
                  {editUnlocked ? 'Verrouiller l\'édition' : 'Déverrouiller l\'édition'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/dashboard/account')}
                >
                  Mettre à jour mes infos pro
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_name">Nom du cessionnaire</Label>
                  <Input
                    id="recipient_name"
                    name="recipient_name"
                    value={formData.recipient_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="recipient_email">Email du cessionnaire</Label>
                  <Input
                    id="recipient_email"
                    name="recipient_email"
                    type="email"
                    value={formData.recipient_email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipient_company">Société du cessionnaire</Label>
                <Input
                  id="recipient_company"
                  name="recipient_company"
                  value={formData.recipient_company}
                  onChange={handleInputChange}
                  readOnly={!editUnlocked}
                  required
                />
              </div>

              <div>
                <Label htmlFor="recipient_address">Adresse du cessionnaire</Label>
                <Textarea
                  id="recipient_address"
                  name="recipient_address"
                  value={formData.recipient_address}
                  onChange={handleInputChange}
                  readOnly={!editUnlocked}
                  required
                />
              </div>

              {companySettings && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Informations société</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nom</Label>
                      <Input value={companySettings.company_name || ''} readOnly />
                    </div>
                    <div>
                      <Label>SIRET</Label>
                      <Input value={companySettings.siret || ''} readOnly />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={companySettings.phone || ''} readOnly />
                    </div>
                    <div>
                      <Label>RCS/RM</Label>
                      <Input value={companySettings.rcs_number || ''} readOnly />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Adresse</Label>
                      <Textarea value={`${companySettings.address_street || ''}\n${companySettings.address_zip_code || ''} ${companySettings.address_city || ''}`} readOnly />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_phone">Téléphone</Label>
                  <Input
                    id="recipient_phone"
                    name="recipient_phone"
                    value={formData.recipient_phone}
                    onChange={handleInputChange}
                    readOnly={!editUnlocked}
                  />
                </div>
                <div>
                  <Label htmlFor="recipient_siret">SIRET</Label>
                  <Input
                    id="recipient_siret"
                    name="recipient_siret"
                    value={formData.recipient_siret}
                    onChange={handleInputChange}
                    readOnly={!editUnlocked}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_ape_code">Code APE</Label>
                  <Input
                    id="recipient_ape_code"
                    name="recipient_ape_code"
                    value={formData.recipient_ape_code}
                    onChange={handleInputChange}
                    readOnly={!editUnlocked}
                  />
                </div>
                <div>
                  <Label htmlFor="recipient_rcs">RCS</Label>
                  <Input
                    id="recipient_rcs"
                    name="recipient_rcs"
                    value={formData.recipient_rcs}
                    onChange={handleInputChange}
                    readOnly={!editUnlocked}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipient_website">Site web</Label>
                <Input
                  id="recipient_website"
                  name="recipient_website"
                  value={formData.recipient_website}
                  onChange={handleInputChange}
                  readOnly={!editUnlocked}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Montant de la cession (€)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="Montant total de la facture par défaut"
                  />
                </div>

                <div>
                  <Label htmlFor="due_date">Date d'échéance</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Informations complémentaires sur cette cession"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Signature du client</Label>
                  <Button type="button" variant="outline" onClick={() => setShowSignatureModal('client')}>
                    {clientSignature ? 'Modifier la signature' : 'Signer'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Signature du réparateur</Label>
                  <Button type="button" variant="outline" onClick={() => setShowSignatureModal('dealer')}>
                    {dealerSignature ? 'Modifier la signature' : 'Signer'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/cessions')}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !formData.client_id ||
              !formData.invoice_id ||
              !clientSignature ||
              !dealerSignature
            }
          >
            {loading ? 'Création...' : 'Créer la cession'}
          </Button>
        </CardFooter>
      </Card>
      {showSignatureModal === 'client' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <ElectronicSignature onSave={handleClientSignatureSave} onCancel={() => setShowSignatureModal(null)} signerType="client" title="Signature du client" />
          </motion.div>
        </div>
      )}
      {showSignatureModal === 'dealer' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <ElectronicSignature onSave={handleDealerSignatureSave} onCancel={() => setShowSignatureModal(null)} signerType="dealer" title="Signature du réparateur" />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CreateCessionCreancePage;