import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

export class VehicleLoan {
  static async getAll() {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux prêts de véhicules");
      }
      
      // Récupérer tous les véhicules de prêt de l'utilisateur
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('loan_vehicles')
        .select('id')
        .eq('user_id', session.user.id);
        
      if (vehiclesError) throw vehiclesError;
      
      if (!vehicles || vehicles.length === 0) {
        return []; // Aucun véhicule, donc aucun prêt
      }
      
      const vehicleIds = vehicles.map(v => v.id);
      
      // Récupérer les prêts pour ces véhicules
      const { data, error } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          loan_vehicles(id, make, model, registration),
          clients(id, first_name, last_name)
        `)
        .in('vehicle_id', vehicleIds)
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting vehicle loans:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder à ce prêt");
      }
      
      const { data, error } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          loan_vehicles(*, vehicle_damages(*)),
          clients(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Vérifier que ce prêt concerne un véhicule appartenant à l'utilisateur
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('user_id')
        .eq('id', data.vehicle_id)
        .single();
        
      if (vehicleError) throw vehicleError;
      
      if (vehicleCheck.user_id !== session.user.id) {
        throw new Error("Vous n'avez pas l'autorisation d'accéder à ce prêt");
      }
      
      return data;
    } catch (error) {
      console.error('Error getting vehicle loan:', error);
      throw error;
    }
  }
  
  static async create(loanData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour créer un prêt");
      }
      
      // Validate required data
      if (!loanData.vehicle_id) {
        throw new Error("ID du véhicule manquant");
      }
      
      if (!loanData.client_id) {
        throw new Error("ID du client manquant");
      }
      
      // Vérifier que le véhicule appartient à l'utilisateur et qu'il est disponible
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('user_id, status')
        .eq('id', loanData.vehicle_id)
        .single();
        
      if (vehicleError) throw vehicleError;
      
      if (!vehicleCheck) {
        throw new Error("Véhicule introuvable");
      }
      
      if (vehicleCheck.user_id !== session.user.id) {
        throw new Error("Vous n'avez pas l'autorisation d'utiliser ce véhicule");
      }
      
      if (vehicleCheck.status !== 'available') {
        throw new Error("Ce véhicule n'est pas disponible pour un prêt");
      }
      
      // Vérifier que le client existe
      const { data: clientCheck, error: clientError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', loanData.client_id)
        .single();
        
      if (clientError) throw clientError;
      
      if (!clientCheck || clientCheck.user_id !== session.user.id) {
        throw new Error("Client introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }

      // Préparer les données pour la création du prêt
      const vehicleLoanData = {
        vehicle_id: loanData.vehicle_id,
        client_id: loanData.client_id,
        start_date: loanData.start_date,
        expected_end_date: loanData.expected_end_date,
        start_mileage: loanData.start_mileage,
        start_fuel_level: loanData.start_fuel_level,
        driver_license_front_url: loanData.driver_license_front_url,
        driver_license_back_url: loanData.driver_license_back_url,
        driver_name: loanData.driver_name,
        driver_license_number: loanData.driver_license_number,
        driver_license_issue_date: loanData.driver_license_issue_date,
        driver_birthdate: loanData.driver_birthdate,
        driver_birthplace: loanData.driver_birthplace,
        insurance_company: loanData.insurance_company,
        insurance_policy_number: loanData.insurance_policy_number,
        contract_signed: loanData.contract_signed || false,
        contract_url: loanData.contract_url,
        client_signature_url: loanData.client_signature_url,
        dealer_signature_url: loanData.dealer_signature_url,
        signature_date: loanData.signature_date || new Date().toISOString(),
        initial_condition_report: loanData.initial_condition_report || null,
        notes: loanData.notes
      };
      
      // Créer le prêt
      const { data, error } = await supabase
        .from('vehicle_loans')
        .insert([vehicleLoanData])
        .select();
        
      if (error) throw error;
      
      // Mettre à jour le statut du véhicule
      const { error: updateError } = await supabase
        .from('loan_vehicles')
        .update({ status: 'loaned' })
        .eq('id', loanData.vehicle_id);
        
      if (updateError) throw updateError;
      
      return data[0];
    } catch (error) {
      console.error('Error creating vehicle loan:', error);
      throw error;
    }
  }
  
  static async update(id, loanData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier un prêt");
      }
      
      // Vérifier que le prêt existe et concerne un véhicule appartenant à l'utilisateur
      const { data: loanCheck, error: loanError } = await supabase
        .from('vehicle_loans')
        .select(`
          vehicle_id,
          loan_vehicles(user_id)
        `)
        .eq('id', id)
        .single();
        
      if (loanError) throw loanError;
      
      if (!loanCheck || loanCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Prêt introuvable ou vous n'avez pas l'autorisation de le modifier");
      }

      // Préparer les données pour la mise à jour
      const updateData = {
        expected_end_date: loanData.expectedEndDate,
        actual_end_date: loanData.actualEndDate,
        end_mileage: loanData.endMileage,
        end_fuel_level: loanData.endFuelLevel,
        driver_license_front_url: loanData.driverLicenseFrontUrl,
        driver_license_back_url: loanData.driverLicenseBackUrl,
        driver_name: loanData.driverName,
        driver_license_number: loanData.driverLicenseNumber,
        driver_license_issue_date: loanData.driverLicenseIssueDate,
        driver_birthdate: loanData.driverBirthdate,
        driver_birthplace: loanData.driverBirthplace,
        insurance_company: loanData.insuranceCompany,
        insurance_policy_number: loanData.insurancePolicyNumber,
        contract_signed: loanData.contractSigned,
        contract_url: loanData.contractUrl,
        client_signature_url: loanData.clientSignatureUrl,
        dealer_signature_url: loanData.dealerSignatureUrl,
        signature_date: loanData.signatureDate,
        initial_condition_report: loanData.initialConditionReport,
        final_condition_report: loanData.finalConditionReport,
        notes: loanData.notes,
        updated_at: new Date()
      };
      
      // Ne mettre à jour que les champs fournis
      const cleanUpdateData = Object.entries(updateData)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      // Mettre à jour le prêt
      const { data, error } = await supabase
        .from('vehicle_loans')
        .update(cleanUpdateData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Si le prêt est terminé, mettre à jour le statut du véhicule
      if (loanData.actualEndDate) {
        const { error: updateError } = await supabase
          .from('loan_vehicles')
          .update({ 
            status: 'available',
            current_mileage: loanData.endMileage,
            fuel_level: loanData.endFuelLevel
          })
          .eq('id', loanCheck.vehicle_id);
          
        if (updateError) throw updateError;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating vehicle loan:', error);
      throw error;
    }
  }
  
  static async endLoan(id, endData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour terminer un prêt");
      }
      
      // Vérifier que le prêt existe et concerne un véhicule appartenant à l'utilisateur
      const { data: loanCheck, error: loanError } = await supabase
        .from('vehicle_loans')
        .select(`
          vehicle_id,
          loan_vehicles(user_id),
          initial_condition_report
        `)
        .eq('id', id)
        .single();
        
      if (loanError) throw loanError;
      
      if (!loanCheck || loanCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Prêt introuvable ou vous n'avez pas l'autorisation de le modifier");
      }
      
      // Préparer les données pour la fin du prêt
      const updateData = {
        actual_end_date: new Date().toISOString(),
        end_mileage: endData.endMileage,
        end_fuel_level: endData.endFuelLevel,
        final_condition_report: endData.finalConditionReport || null,
        notes: endData.notes,
        updated_at: new Date().toISOString()
      };
      
      // Si un document de fin est fourni, l'ajouter
      if (endData.returnDocUrl) {
        updateData.contract_url = endData.returnDocUrl;
      }
      
      // Mettre à jour le prêt
      const { data, error } = await supabase
        .from('vehicle_loans')
        .update(updateData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Mettre à jour le statut du véhicule et son kilométrage actuel
      const { error: updateError } = await supabase
        .from('loan_vehicles')
        .update({ 
          status: 'available',
          current_mileage: endData.endMileage,
          fuel_level: endData.endFuelLevel
        })
        .eq('id', loanCheck.vehicle_id);
        
      if (updateError) throw updateError;
      
      return data[0];
    } catch (error) {
      console.error('Error ending vehicle loan:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour supprimer un prêt");
      }
      
      // Vérifier que le prêt existe et concerne un véhicule appartenant à l'utilisateur
      const { data: loanCheck, error: loanError } = await supabase
        .from('vehicle_loans')
        .select(`
          vehicle_id,
          actual_end_date,
          loan_vehicles(user_id)
        `)
        .eq('id', id)
        .single();
        
      if (loanError) throw loanError;
      
      if (!loanCheck || loanCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Prêt introuvable ou vous n'avez pas l'autorisation de le supprimer");
      }
      
      // Si le prêt est en cours, on ne peut pas le supprimer
      if (!loanCheck.actual_end_date) {
        throw new Error("Impossible de supprimer un prêt en cours. Veuillez d'abord terminer le prêt.");
      }
      
      const { error } = await supabase
        .from('vehicle_loans')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting vehicle loan:', error);
      throw error;
    }
  }
  
  /**
   * Génère un contrat de prêt PDF avec signatures
   * @param {string} id Identifiant du prêt
   * @returns {Promise<Blob>} Document PDF
   */
  static async generateContract(id, userProfile = null) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour générer un contrat");
      }
      
      // Récupérer toutes les informations nécessaires
      const { data: loan, error: loanError } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          loan_vehicles(*),
          clients(*)
        `)
        .eq('id', id)
        .single();
        
      if (loanError) throw loanError;
      
      if (!loan) {
        throw new Error("Prêt introuvable");
      }

      // Vérifier les signatures
      if (!loan.client_signature_url || !loan.dealer_signature_url) {
        throw new Error("Les signatures du client et du carrossier sont requises pour générer le contrat");
      }
      
      // Récupérer les informations de l'entreprise si non fournies
      let profile = userProfile;
      if (!profile) {
        const { data: userProfileData, error: profileError } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw profileError;
        profile = userProfileData;
      }
      
      // Créer un nouveau document PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Ajouter un logo d'entreprise si disponible
      if (profile?.logo_url) {
        try {
          // Charger l'image depuis l'URL
          const img = new Image();
          img.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = profile.logo_url;
          });
          
          // Calculer les dimensions pour maintenir le ratio
          const imgRatio = img.width / img.height;
          const maxWidth = 40; // mm
          const maxHeight = 20; // mm
          let imgWidth = maxWidth;
          let imgHeight = imgWidth / imgRatio;
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * imgRatio;
          }
          
          // Créer un canvas pour convertir l'image en Data URL
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg');
          
          // Ajouter l'image au PDF
          doc.addImage(dataUrl, 'JPEG', 20, 15, imgWidth, imgHeight);
        } catch (error) {
          console.warn("Erreur lors du chargement du logo:", error);
          // Fallback - texte simple
          doc.setFillColor(0, 123, 255);
          doc.rect(20, 15, 40, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(profile.company_name || 'AutoCoreAI', 25, 25);
        }
      } else {
        // Fallback - texte simple
        doc.setFillColor(0, 123, 255);
        doc.rect(20, 15, 40, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(profile?.company_name || 'AutoCoreAI', 25, 25);
      }
      
      // Ajouter un titre
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRAT DE PRÊT DE VÉHICULE', 105, 20, { align: 'center' });
      
      // Informations du prêteur
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PRÊTEUR :', 20, 35);
      
      doc.setFont('helvetica', 'normal');
      doc.text(profile?.company_name || 'Nom de l\'entreprise', 20, 42);
      doc.text(profile?.address_street || 'Adresse', 20, 48);
      doc.text(`${profile?.address_zip_code || ''} ${profile?.address_city || ''}`, 20, 54);
      doc.text(`SIRET : ${profile?.siret || ''}`, 20, 60);
      doc.text(`TVA : ${profile?.vat_number || ''}`, 20, 66);
      
      // Ligne de séparation
      doc.setDrawColor(120, 120, 120);
      doc.line(20, 72, 190, 72);
      
      // Informations de l'emprunteur
      doc.setFont('helvetica', 'bold');
      doc.text('EMPRUNTEUR :', 20, 82);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Nom du conducteur : ${loan.driver_name}`, 20, 89);
      doc.text(`Permis de conduire n° : ${loan.driver_license_number}`, 20, 96);
      doc.text(`Date de délivrance : ${new Date(loan.driver_license_issue_date).toLocaleDateString('fr-FR')}`, 20, 103);
      doc.text(`Date de naissance : ${new Date(loan.driver_birthdate).toLocaleDateString('fr-FR')}`, 20, 110);
      doc.text(`Lieu de naissance : ${loan.driver_birthplace}`, 20, 117);
      
      // Ligne de séparation
      doc.line(20, 123, 190, 123);
      
      // Informations du véhicule
      doc.setFont('helvetica', 'bold');
      doc.text('VÉHICULE PRÊTÉ :', 20, 133);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Marque et modèle : ${loan.loan_vehicles.make} ${loan.loan_vehicles.model}`, 20, 140);
      doc.text(`Immatriculation : ${loan.loan_vehicles.registration || 'Non renseignée'}`, 20, 147);
      doc.text(`N° de châssis : ${loan.loan_vehicles.chassis_number || 'Non renseigné'}`, 20, 154);
      doc.text(`Kilométrage au départ : ${loan.start_mileage} km`, 20, 161);
      doc.text(`Niveau de carburant au départ : ${loan.start_fuel_level}%`, 20, 168);
      
      // Ligne de séparation
      doc.line(20, 174, 190, 174);
      
      // Conditions du prêt
      doc.setFont('helvetica', 'bold');
      doc.text('CONDITIONS DU PRÊT :', 20, 184);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Date de début : ${new Date(loan.start_date).toLocaleDateString('fr-FR')}`, 20, 191);
      doc.text(`Date de fin prévue : ${new Date(loan.expected_end_date).toLocaleDateString('fr-FR')}`, 20, 198);
      doc.text(`Assurance : ${loan.insurance_company}`, 20, 205);
      doc.text(`N° de police : ${loan.insurance_policy_number}`, 20, 212);
      
      // Ajouter des notes si présentes
      if (loan.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVATIONS :', 20, 224);
        
        doc.setFont('helvetica', 'normal');
        const notes = doc.splitTextToSize(loan.notes, 150);
        doc.text(notes, 20, 231);
      }
      
      // Ajouter une nouvelle page pour les signatures et conditions générales
      doc.addPage();
      
      // Titre pour les signatures
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SIGNATURES', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fait à ${profile?.address_city || 'Ville'}, le ${new Date(loan.signature_date || new Date()).toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });
      
      // Zone de signature client
      doc.setFont('helvetica', 'bold');
      doc.text('Signature de l\'emprunteur :', 50, 50, { align: 'center' });
      
      // Ajouter la signature du client
      try {
        if (loan.client_signature_url) {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = loan.client_signature_url;
          });
          
          // Ajouter l'image au PDF
          doc.addImage(img, 'PNG', 25, 55, 50, 25);
        } else {
          // Placeholder pour la signature
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(25, 55, 50, 25, 2, 2, 'FD');
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(8);
          doc.text('Signature manquante', 50, 70, { align: 'center' });
        }
      } catch (error) {
        console.warn("Erreur lors du chargement de la signature client:", error);
        // Placeholder pour la signature
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(25, 55, 50, 25, 2, 2, 'FD');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('Erreur de chargement', 50, 70, { align: 'center' });
      }
      
      // Zone de signature carrossier
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Signature du prêteur :', 150, 50, { align: 'center' });
      
      // Ajouter la signature du carrossier
      try {
        if (loan.dealer_signature_url) {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = loan.dealer_signature_url;
          });
          
          // Ajouter l'image au PDF
          doc.addImage(img, 'PNG', 125, 55, 50, 25);
        } else {
          // Placeholder pour la signature
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(125, 55, 50, 25, 2, 2, 'FD');
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(8);
          doc.text('Signature manquante', 150, 70, { align: 'center' });
        }
      } catch (error) {
        console.warn("Erreur lors du chargement de la signature carrossier:", error);
        // Placeholder pour la signature
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(125, 55, 50, 25, 2, 2, 'FD');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('Erreur de chargement', 150, 70, { align: 'center' });
      }
      
      // Ajouter un tampon d'entreprise professionnel
      // Cercle extérieur du tampon
      doc.setDrawColor(0, 0, 150); // Bleu foncé
      doc.setLineWidth(1);
      doc.circle(150, 100, 18); // Cercle extérieur
      
      // Cercle intérieur du tampon
      doc.setDrawColor(0, 0, 150);
      doc.setLineWidth(0.5);
      doc.circle(150, 100, 15); // Cercle intérieur
      
      // Texte dans le tampon
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 150);
      doc.text(profile?.company_name?.toUpperCase() || 'ENTREPRISE', 150, 95, { align: 'center' });
      if (profile?.address_city) {
        doc.text(profile.address_city.toUpperCase(), 150, 100, { align: 'center' });
      }
      if (profile?.siret) {
        doc.text(`SIRET ${profile.siret}`, 150, 105, { align: 'center' });
      }
      if (profile?.rcs_number) {
        doc.text(`RCS ${profile.rcs_number}`, 150, 110, { align: 'center' });
      }
      if (profile?.ape_code) {
        doc.text(`APE ${profile.ape_code}`, 150, 115, { align: 'center' });
      }
      
      // Ajouter 8 petites étoiles autour du cercle pour donner un aspect officiel
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const x = 150 + 17 * Math.cos(angle);
        const y = 100 + 17 * Math.sin(angle);
        
        // Petite étoile à 5 branches
        doc.setFillColor(0, 0, 150);
        doc.circle(x, y, 0.8, 'F');
      }
      
      // Conditions générales
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('CONDITIONS GÉNÉRALES DU PRÊT', 105, 130, { align: 'center' });
      
      // Liste des conditions
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const conditions = [
        "1. L'emprunteur s'engage à utiliser le véhicule en bon père de famille et à le restituer dans l'état où il lui a été confié.",
        "2. L'emprunteur s'engage à ne pas prêter ou louer le véhicule à un tiers.",
        "3. L'emprunteur s'engage à respecter le code de la route et à payer toute contravention éventuelle.",
        "4. L'emprunteur reconnaît que le véhicule est assuré par sa propre assurance pour toute la durée du prêt.",
        "5. En cas d'accident, l'emprunteur s'engage à prévenir immédiatement le prêteur.",
        "6. Le véhicule devra être restitué avec le même niveau de carburant qu'au départ.",
        "7. En cas de retard dans la restitution du véhicule, des frais pourront être facturés.",
        "8. Le prêteur se réserve le droit de réclamer une indemnisation pour tout dommage constaté lors de la restitution.",
        "9. Conformément à la réglementation française 2025, l'emprunteur est responsable de toute infraction commise pendant la durée du prêt.",
        "10. Ce contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents."
      ];
      
      let yPos = 140;
      conditions.forEach((condition, index) => {
        const lines = doc.splitTextToSize(condition, 160);
        doc.text(lines, 20, yPos);
        yPos += 6 + (lines.length - 1) * 3.5;
      });
      
      // Pied de page avec informations légales
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      if (profile?.rcs_number || profile?.ape_code) {
        let legalText = '';
        if (profile.rcs_number) legalText += `RCS ${profile.rcs_number} `;
        if (profile.ape_code) legalText += `- APE ${profile.ape_code}`;
        
        doc.text(legalText, 105, 280, { align: 'center' });
      }
      
      doc.text('Document généré par AutoCoreAI • 2025', 105, 285, { align: 'center' });
      
      // Retourner le document sous forme de blob
      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (error) {
      console.error('Error generating contract:', error);
      throw error;
    }
  }
  
  static async getCurrentLoans() {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux prêts en cours");
      }
      
      // Récupérer tous les véhicules de prêt de l'utilisateur
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('loan_vehicles')
        .select('id')
        .eq('user_id', session.user.id);
        
      if (vehiclesError) throw vehiclesError;
      
      if (!vehicles || vehicles.length === 0) {
        return []; // Aucun véhicule, donc aucun prêt
      }
      
      const vehicleIds = vehicles.map(v => v.id);
      
      // Récupérer les prêts en cours pour ces véhicules
      const { data, error } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          loan_vehicles(id, make, model, registration),
          clients(id, first_name, last_name, email, phone)
        `)
        .in('vehicle_id', vehicleIds)
        .is('actual_end_date', null)
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting current vehicle loans:', error);
      throw error;
    }
  }
  
  static async getClientLoans(clientId) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux prêts d'un client");
      }
      
      // Vérifier que le client appartient à l'utilisateur
      const { data: clientCheck, error: clientError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();
        
      if (clientError) throw clientError;
      
      if (!clientCheck || clientCheck.user_id !== session.user.id) {
        throw new Error("Client introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }
      
      // Récupérer les prêts du client
      const { data, error } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          loan_vehicles(id, make, model, registration)
        `)
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting client vehicle loans:', error);
      throw error;
    }
  }

  static async getByVehicle(vehicleId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux prêts du véhicule");
      }

      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('user_id')
        .eq('id', vehicleId)
        .single();

      if (vehicleError) throw vehicleError;

      if (!vehicleCheck || vehicleCheck.user_id !== session.user.id) {
        throw new Error("Véhicule introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }

      const { data, error } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          clients(id, first_name, last_name)
        `)
        .eq('vehicle_id', vehicleId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting vehicle loans:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour les signatures et génère le contrat de prêt
   * @param {string} id Identifiant du prêt
   * @param {object} signatureData Données de signature
   * @returns {Promise<object>} Prêt mis à jour
   */
  static async updateSignatures(id, signatureData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour mettre à jour les signatures");
      }
      
      // Vérifier que le prêt existe et concerne un véhicule appartenant à l'utilisateur
      const { data: loanCheck, error: loanError } = await supabase
        .from('vehicle_loans')
        .select(`
          vehicle_id,
          loan_vehicles(user_id)
        `)
        .eq('id', id)
        .single();
        
      if (loanError) throw loanError;
      
      if (!loanCheck || loanCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Prêt introuvable ou vous n'avez pas l'autorisation de le modifier");
      }

      // Vérifier que les signatures sont présentes
      if (!signatureData.client_signature_url || !signatureData.dealer_signature_url) {
        throw new Error("Les signatures du client et du carrossier sont requises");
      }
      
      // Préparer les données pour la mise à jour
      const updateData = {
        client_signature_url: signatureData.client_signature_url,
        dealer_signature_url: signatureData.dealer_signature_url,
        signature_date: new Date().toISOString(),
        contract_signed: true,
        updated_at: new Date().toISOString()
      };
      
      // Mettre à jour le prêt avec les signatures
      const { data, error } = await supabase
        .from('vehicle_loans')
        .update(updateData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Récupérer le profil utilisateur pour générer le contrat
      const { data: userProfile, error: profileError } = await supabase
        .from('users_extended')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Générer le contrat de prêt
      const contractBlob = await VehicleLoan.generateContract(id, userProfile);
      
      // Créer un nom de fichier unique
      const fileName = `contrat_pret_${id}_${Date.now()}.pdf`;
      const filePath = `loan_vehicles/contracts/${fileName}`;
      
      // Uploader le contrat vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, contractBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });
        
      if (uploadError) throw uploadError;
      
      // Récupérer l'URL public
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);
        
      // Mettre à jour le prêt avec l'URL du contrat
      const { data: updatedLoan, error: updateError } = await supabase
        .from('vehicle_loans')
        .update({
          contract_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
        
      if (updateError) throw updateError;
      
      return updatedLoan[0];
    } catch (error) {
      console.error('Error updating signatures:', error);
      throw error;
    }
  }
}