import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Fetch company (dealer) information from the current user's settings
 */
const useCompanySettings = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        // Build a simplified company object used by forms
        setCompany({
          name: data.company_name || '',
          address: [data.address_street, `${data.address_zip_code || ''} ${data.address_city || ''}`]
            .filter(Boolean)
            .join('\n'),
          phone: data.phone || '',
          siret: data.siret || '',
          apeCode: data.ape_code || '',
          rcs: data.rcs_number || '',
          website: data.website || 'https://autocore.ai',
          vat_number: data.vat_number || ''
        });
      } catch (err) {
        console.error('Error loading company settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, []);

  return { company, loading };
};

export default useCompanySettings;
