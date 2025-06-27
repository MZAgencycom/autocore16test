import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import ElectronicSignature from '../../components/loan-vehicles/ElectronicSignature';

const CessionSignPage = () => {
  const { token } = useParams();
  const [cession, setCession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [signer, setSigner] = useState(null);

  useEffect(() => {
    const fetchCession = async () => {
      const { data, error } = await supabase
        .from('cession_creances')
        .select('*')
        .or(`client_sign_token.eq.${token},repairer_sign_token.eq.${token}`)
        .single();
      if (!error && data) {
        setCession(data);
        if (token === data.client_sign_token) setSigner('client');
        if (token === data.repairer_sign_token) setSigner('repairer');
      }
      setLoading(false);
    };
    fetchCession();
  }, [token]);

  const handleSave = async (url) => {
    if (!cession) return;
    const updateData = signer === 'client' ? { client_signature_url: url } : { repairer_signature_url: url };
    const { data, error } = await supabase
      .from('cession_creances')
      .update(updateData)
      .eq('id', cession.id)
      .select('*')
      .single();
    if (!error) {
      if (data.client_signature_url && data.repairer_signature_url) {
        await supabase
          .from('cession_creances')
          .update({ status: 'signed' })
          .eq('id', cession.id);
      }
      setSigned(true);
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (signed) return <div className="p-6">Merci, votre signature a été enregistrée.</div>;
  if (!cession || !signer) return <div className="p-6">Cession introuvable.</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Signature de la cession de créance</h1>
      <p className="mb-4">Veuillez signer le document ci-dessous pour valider la cession de créance.</p>
      <ElectronicSignature onSave={handleSave} signerType={signer} showLegalNote />
    </div>
  );
};

export default CessionSignPage;
