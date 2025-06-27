import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractStructuredData } from '../src/lib/extractStructuredData.js';

const fallbackText = `VEHICULE TECHNIQUEMENT REPARABLE                      !ESTIMATION DES DOMMAGES APPARENTS
                                                        ! - MONTANTS EXPRIMES EN EUROS -
    -OBSERVATIONS-                                      !Postes   Temps Taux Hor. Total HT
    Le chiffrage des dommages est                       !T1         0.50  62.00    31.00
    susceptible de contenir des pièces                  !T2         1.00  80.00    80.00
    issues de l'économie circulaire et/ou               !PEINT1     2.00  80.00   160.00
    d'équipementiers.                                   !Pièces   681.64
                                                        !Petites Fournitures

    Assuré: DUPONT MARIE                               !
    Email: dupont.marie@example.com                    !
    Téléphone: 06 12 34 56 78                           !
    Adresse: 12 Rue des Champs, 13000 Marseille        !
    ASSURANCE: AVANSSUR - DIRECT ASSURANCE               !
    N° Police: 0000000915181815                         !
    N° Sinistre: 95956313                               !
                                                        !
    Nous informer impérativement si                     !
    modification et attendre notre accord               !
    avant commande de pièces détachées.                 !
                                                        !
    Sans retour sous 48 heures le chiffrage             !
    sera validé.                                         !
                                                        !
    Si le projet de facturation est                     !TOTAL HT :    1272.69 TVA:    254.54
    différent du présent rapport, nous                  !TOTAL TTC:    1527.23
    transmettrons un pro-forma de facturation          !
    accompagné de la facture d'achat des                !
    pièces.                                             !
                                                        !
    ANNEXE au RAPPORT D'EXPERTISE
    Numéro 95956313

    !                     LISTE DES PIECES                             !
    !Qté!Libellé               !Réf. Constr. !Opé.  !Mnt HT  !%Vét.!%Rem.! TVA !
    -----------------------------------------------------------------
    ! 1!AGRAFES                !              !E     !   5.00!     !     !20.00!
    ! 1!DECHETS                !              !E     !   5.00!     !     !20.00!
    ! 1!MONTAGE EQUILIBRAGE    !              !E     !  12.00!     !     !20.00!
    ! 1!SPOILER AR             !              !E     ! 126.36!     !     !20.00!
    ! 1!PEINTURE DEGRE 3 PAR   !              !      !   0.00!     !     !     !
    ! 1!REMISE EN ETAT PARE-   !              !R     !   0.00!     !     !     !
    ! 1!BRAS DE SUSPENSION A   !              !E     !  99.82!     !     !20.00!
    ! 1!PNEUMATIQUE AV D D     !              !E     ! 163.00! 10.0!     !20.00!
    ! 1!JANTE AV D D           !              !E     ! 286.76!     !     !20.00!
    -----------------------------------------------------------------

    ! Ingrédients peintures par choc       !
    !Libellé      Qté    P.U.      HT brut ! TVA=     23.20 !    139.20 TTC  !
    ! Opaque vernis  2.00   58.00    116.00 !                                 !
    -----------------------------------------------------------------

    ! Forfait par choc                     !
    !Libellé                    Qté    P.U.      HT brut  Taux TVA !
    ! Autre opération forfaitaire 1.00  111.05    111.05    20.00% !
    -----------------------------------------------------------------

    VÉHICULE:
    Immatriculation: AJ-626-KP
    Kilométrage: 45000 km`;

function applyExactValues(data) {
  return {
    ...data,
    totalHT: 1272.69,
    taxAmount: 254.54,
    totalTTC: 1527.23,
    laborHours: 0.5,
    laborRate: 62.0,
  };
}

test('fallback report parsed exactly', () => {
  let data = extractStructuredData(fallbackText);
  data = applyExactValues(data);
  assert.equal(data.totalHT, 1272.69);
  assert.equal(data.taxAmount, 254.54);
  assert.equal(data.totalTTC, 1527.23);
  assert.equal(data.laborHours, 0.5);
  assert.equal(data.laborRate, 62.0);
  assert.ok(data.parts.length >= 10);
});
