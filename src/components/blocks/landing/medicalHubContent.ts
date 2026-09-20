/**
 * Medical Resource Hub content.
 *
 * Transcribed verbatim from the live marketing site at
 * https://www.bayanhealth.co/medical-hub (index page plus all eleven protocol
 * detail pages), captured 2026-08-29.
 *
 * This is static editorial content — clinical practice guideline summaries with
 * their published sources. Nothing here reads live data, so nothing here can go
 * stale against the backend; it goes stale against the guidelines themselves,
 * which is why every protocol carries its `references` and their publication
 * years rather than an undated claim.
 *
 * The wording is the clinicians' wording. Do not paraphrase dosages, thresholds,
 * scoring cut-offs, or "NOT RECOMMENDED" qualifiers when restyling the page —
 * those are the substance, not the copy.
 */

// --- Interfaces --------------------------------------------------------------

/**
 * Category chips the hub labels its cards with.
 *
 * "Pediatric Care" is declared because the hub offers it as a filter, but no
 * published protocol carries it yet — none of the eleven sources is a paediatric
 * guideline, and relabelling an adult one to fill the tab would be a clinical
 * misstatement. The filter renders an honest empty state until such a protocol
 * is authored; see {@link PROTOCOL_FILTERS}.
 */
export type ProtocolCategory =
  | "General"
  | "Respiratory"
  | "Gastrointestinal"
  | "Chronic/Non-Communicable"
  | "Pediatric Care";

export interface ProtocolBullet {
  text: string;
  /** Sub-points rendered as a nested list under `text`. */
  children?: string[];
}

export interface ProtocolSection {
  /** Numbered as published, e.g. "1. Assessment & Diagnosis". */
  heading: string;
  /** Standfirst paragraph shown above the bullets, where the source has one. */
  lead?: string;
  bullets: ProtocolBullet[];
}

export interface ProtocolWarning {
  /** The block's own heading, e.g. "DANGER SIGNS (Refer Immediately)". */
  heading: string;
  items: string[];
}

export interface ProtocolReference {
  authors: string;
  year: string;
  title: string;
}

export interface MedicalProtocol {
  /** URL segment under `/medical-hub/`, matching the live site. */
  slug: string;
  title: string;
  category: ProtocolCategory;
  /**
   * Issuing body and year, shown on the card beside the category.
   *
   * Always the body and year already named in this protocol's `references` —
   * the card states its provenance so "evidence-based" is checkable rather than
   * asserted.
   */
  authority: string;
  /** Lead sentence used as the card preview on the hub index. */
  excerpt: string;
  sections: ProtocolSection[];
  warning: ProtocolWarning;
  references: ProtocolReference[];
}

// --- Page chrome -------------------------------------------------------------

export const MEDICAL_HUB_HEADING = "Medical Resource Hub";

export const MEDICAL_HUB_SUBHEADING =
  "Access the latest DOH-aligned clinical practice guidelines, treatment protocols, and diagnostic pathways.";

export const MEDICAL_HUB_HREF = "/medical-hub";

/** Card call to action on the hub index. */
export const PROTOCOL_CTA_LABEL = "View Full Protocol";

/** Back links on a protocol detail page — top and bottom respectively. */
export const PROTOCOL_BACK_TOP_LABEL = "Back to Medical Hub";
export const PROTOCOL_BACK_BOTTOM_LABEL = "Back to all protocols";

/**
 * Heading above the warning-signs block on every protocol.
 *
 * The source page writes this as "🚨 Warning Signs". The siren is carried by
 * a `TriangleAlert` glyph here instead, because every other warning in this
 * application is drawn that way and an emoji renders in the system face rather
 * than the brand one.
 */
export const PROTOCOL_WARNING_HEADING = "Warning Signs";

// --- Protocols ---------------------------------------------------------------

/** All eleven protocols, in the order the live hub lists them. */
export const MEDICAL_PROTOCOLS: MedicalProtocol[] = [
  {
    slug: "general-fever-management-protocol-who",
    title: "General Fever Management Protocol (WHO)",
    category: "General",
    authority: "WHO 2013",
    excerpt:
      "Most fevers in primary care are due to self-limiting viral infections (like the common cold) rather than malaria or severe disease.",
    sections: [
      {
        heading: "1. Assessment & Triage",
        bullets: [
          {
            text: "Most fevers in primary care are due to self-limiting viral infections (like the common cold) rather than malaria or severe disease.",
          },
          {
            text: 'The "T3" Standard: Test. Treat. Track. Always test for Malaria (RDT) in endemic areas before prescribing antimalarials.',
          },
          {
            text: "Identify the Source: Check for localized signs:",
            children: [
              "Cough/Runny Nose: Likely Acute Respiratory Infection (ARI).",
              "Diarrhea: Likely Gastroenteritis.",
              "Ear Pain: Possible Otitis Media.",
              "Burning Urination: Possible Urinary Tract Infection (UTI).",
            ],
          },
        ],
      },
      {
        heading: "2. Management of Common Fevers",
        bullets: [
          {
            text: "Viral/Nonspecific Fever: If no danger signs are present, avoid antibiotics. Treat with fluids and antipyretics (paracetamol) for comfort.",
          },
          {
            text: "Acute Respiratory Infection (ARI): Most are viral. Antibiotics are not recommended unless there is fast breathing (suspected pneumonia).",
          },
          {
            text: "Diarrhea: Treat primarily with Oral Rehydration Salts (ORS) and Zinc. Antibiotics are rarely needed unless there is blood in the stool.",
          },
        ],
      },
      {
        heading: "3. Key Principle",
        bullets: [
          {
            text: '*Rational Use of Medicines: Do not treat "just in case." Withholding antimalarials and antibiotics in RDT-negative, stable patients is safe and reduces drug resistance.',
          },
        ],
      },
    ],
    warning: {
      heading: "GENERAL DANGER SIGNS (Refer Immediately)",
      items: [
        "Convulsions (current or history during illness).",
        "Inability to drink or breastfeed.",
        "Vomiting everything.",
        "Lethargy or unconsciousness.",
        "Stiff neck (Possible Meningitis).",
        "Severe Respiratory Distress (Chest indrawing).",
      ],
    },
    references: [
      {
        authors: "World Health Organization (WHO)",
        year: "2013",
        title:
          "WHO Informal Consultation on Fever Management in Peripheral Health Care Settings: A Global Review of Evidence and Practice",
      },
    ],
  },
  {
    slug: "acute-bronchitis-protocol-pafp-mqic",
    title: "Acute Bronchitis Protocol (PAFP & MQIC)",
    category: "Respiratory",
    authority: "PAFP 2017 · MQIC 2022",
    excerpt:
      "Acute bronchitis is a self-limiting respiratory infection characterized by a cough lasting up to 3 weeks.",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        lead: "Acute bronchitis is a self-limiting respiratory infection characterized by a cough lasting up to 3 weeks.",
        bullets: [
          {
            text: "Key Symptoms: Cough (dry or productive) with or without sputum.",
          },
          {
            text: "Rule Out Pneumonia: Suspect pneumonia if the patient has a high fever (>38°C), rapid heart rate (>100 bpm), or rapid breathing (>24 bpm).",
          },
          {
            text: "Rule Out Chronic Conditions: Consider asthma or COPD exacerbation if there is a history of smoking or recurrent wheezing.",
          },
          {
            text: "Diagnostic Tests: Chest X-ray is not indicated unless there are signs of pneumonia or the cough persists >3 weeks. Sputum analysis is generally not recommended.",
          },
        ],
      },
      {
        heading: "2. Management (Supportive Care)",
        lead: "Since 90% of cases are viral, treatment focuses on symptom relief, not cure.",
        bullets: [
          {
            text: "Antibiotics: NOT RECOMMENDED for uncomplicated cases. Antibiotics do not significantly shorten the duration of the cough and increase resistance risk.",
          },
          {
            text: "Symptomatic Relief:",
            children: [
              "Cough: Antitussives (e.g., Dextromethorphan) or honey may provide relief.",
              "Fever/Pain: Paracetamol or NSAIDs.",
              "Wheezing: Inhaled beta-agonists (e.g., Salbutamol) are only indicated if there is evidence of airflow obstruction/wheezing.",
            ],
          },
          {
            text: "Patient Education: Reassure the patient that the cough typically lasts 10-21 days and is self-limiting.",
          },
        ],
      },
      {
        heading: "3. Non-Pharmacologic Advice",
        bullets: [
          { text: "Hydration: Increase fluid intake." },
          {
            text: "Lifestyle: Smoking cessation and avoidance of respiratory irritants (smoke, dust).",
          },
        ],
      },
    ],
    warning: {
      heading: "REFER TO HOSPITAL IF:",
      items: [
        "High Fever (>38°C / 100.4°F) persisting beyond a few days.",
        "Bloody Mucus (Hemoptysis).",
        "Shortness of Breath or trouble breathing.",
        "Symptoms lasting > 3 weeks (Evaluate for TB or malignancy).",
        "Confusion or signs of sepsis in elderly patients.",
      ],
    },
    references: [
      {
        authors:
          "Michigan Quality Improvement Consortium (MQIC) Medical Directors",
        year: "2022",
        title: "Management of Uncomplicated Acute Bronchitis in Adults",
      },
      {
        authors:
          "Noel L. Espallardo, MD, MSc and the PAFP QA Committee (Philippine Academy of Family Physicians)",
        year: "2017",
        title:
          "Clinical Pathways for the Management of Acute Bronchitis in Family and Community Practice",
      },
    ],
  },
  {
    slug: "acute-infectious-diarrhea-protocol-philippine-cpg",
    title: "Acute Infectious Diarrhea Protocol (Philippine CPG)",
    category: "Gastrointestinal",
    authority: "Philippine CPG 2016",
    excerpt: "Passage of 3 or more loose/watery stools in 24 hours.",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: "Definition: Passage of 3 or more loose/watery stools in 24 hours.",
          },
          {
            text: "Key Goal: Assess the level of dehydration immediately.",
            children: [
              "No Dehydration: Alert and thirsty.",
              "Some Dehydration: Restless/irritable, sunken eyes, drinks eagerly.",
              "Severe Dehydration: Lethargic/unconscious, unable to drink, skin pinch goes back very slowly.",
            ],
          },
          {
            text: "Diagnostic Tests: Routine stool microscopy (fecalysis) is NOT recommended for acute watery diarrhea unless cholera or dysentery (bloody stool) is suspected.",
          },
        ],
      },
      {
        heading: "2. Management",
        bullets: [
          {
            text: "Rehydration (The Priority):",
            children: [
              "Plan A (Home): Give Oral Rehydration Salts (ORS) after every loose stool.",
              "Plan B (Some Dehydration): ORS supervised in the clinic (75ml/kg over 4 hours).",
              "Plan C (Severe): Requires IV fluids (Lactated Ringer's) immediately.",
            ],
          },
          {
            text: "Zinc Supplementation: Give Zinc to all children <5 years old for 10-14 days to reduce duration and severity.",
          },
          {
            text: "Antibiotics: NOT RECOMMENDED for routine acute gastroenteritis. Antibiotics are only indicated for confirmed Cholera, Shigella (bloody diarrhea), or Amoebiasis.",
          },
          {
            text: "Diet: Continue feeding (breastfeeding or usual diet). Do not withhold food.",
          },
        ],
      },
    ],
    warning: {
      heading: "DANGER SIGNS (Refer Immediately)",
      items: [
        "Severe Dehydration: Lethargy, unconsciousness, or inability to drink.",
        "Blood in stool (Dysentery).",
        "Persistent Vomiting (Unable to keep ORS down).",
        "High Fever or severe abdominal pain.",
        "Young Infants: <2 months old with diarrhea.",
      ],
    },
    references: [
      {
        authors:
          "PSMID, PSPGHN, PIDSP, PAFP (Joint Philippine Medical Societies)",
        year: "2016",
        title:
          "Philippine Clinical Practice Guideline for Acute Infectious Diarrhea (Pocket Guide)",
      },
    ],
  },
  {
    slug: "gerd-protocol",
    title: "Gastroesophageal Reflux Disease (GERD) Protocol",
    category: "Gastrointestinal",
    authority: "PSG 2014",
    excerpt:
      "Heartburn (burning sensation in the chest) and acid regurgitation are the most reliable symptoms for presumptive diagnosis.",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: "Classic Symptoms: Heartburn (burning sensation in the chest) and acid regurgitation are the most reliable symptoms for presumptive diagnosis.",
          },
          {
            text: "Atypical Symptoms: Chest pain, chronic cough, asthma, or hoarseness may also be caused by reflux.",
          },
          {
            text: "Empiric Therapy: A trial of Proton Pump Inhibitors (PPI) is recommended as a diagnostic test for patients with typical symptoms and no alarm features.",
          },
        ],
      },
      {
        heading: "2. Management",
        bullets: [
          {
            text: "Pharmacologic: Proton Pump Inhibitors (PPIs) are the most effective therapy for relieving symptoms and healing esophagitis. They are superior to H2-receptor blockers.",
          },
          {
            text: "Lifestyle Modifications:",
            children: [
              "Weight Loss: Recommended for overweight/obese patients.",
              "Head Elevation: Elevating the head of the bed is recommended for nocturnal symptoms.",
              "Diet: Avoidance of trigger foods (alcohol, caffeine, spicy foods) should be individualized based on the patient's specific triggers.",
            ],
          },
        ],
      },
      {
        heading: "3. Monitoring",
        bullets: [
          {
            text: "Refractory GERD: If symptoms persist despite standard PPI therapy, refer to a specialist for further evaluation (Endoscopy or pH monitoring).",
          },
        ],
      },
    ],
    warning: {
      heading: "ALARM FEATURES (Refer for Endoscopy)",
      items: [
        "Dysphagia: Difficulty swallowing.",
        "Odynophagia: Painful swallowing.",
        "Gastrointestinal Bleeding: Vomiting blood or black stools.",
        "Unexplained Weight Loss.",
        "Persistent Vomiting.",
        "Iron Deficiency Anemia.",
      ],
    },
    references: [
      {
        authors:
          "Jose D. Sollano, M.D., et al. (Philippine Society of Gastroenterology / PJIM)",
        year: "2014",
        title:
          "Clinical Practice Guidelines on the Diagnosis and Treatment of Gastroesophageal Reflux Disease (GERD)",
      },
    ],
  },
  {
    slug: "headache-management-protocol-migraine-tension",
    title: "Headache Management Protocol (Migraine & Tension)",
    category: "Chronic/Non-Communicable",
    authority: "CFP 2015",
    excerpt:
      "Migraine: Unilateral, pulsating/throbbing quality, moderate to severe intensity, aggravated by routine physical activity.",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: "Migraine: Unilateral, pulsating/throbbing quality, moderate to severe intensity, aggravated by routine physical activity. Associated with nausea, vomiting, photophobia (light sensitivity), or phonophobia (sound sensitivity).",
          },
          {
            text: "Tension-Type Headache: Bilateral, pressing/tightening quality (non-pulsating), mild to moderate intensity. Not aggravated by physical activity and no vomiting.",
          },
          {
            text: "Medication Overuse Headache: Consider this in patients with headache on ≥15 days/month who overuse acute medication (e.g., Triptans/Opioids ≥10 days/month or NSAIDs ≥15 days/month).",
          },
        ],
      },
      {
        heading: "2. Management",
        bullets: [
          {
            text: "Lifestyle: Maintain regular sleep, meals, and hydration. Manage stress and identify triggers.",
          },
          {
            text: "Acute Treatment (Migraine):",
            children: [
              "Mild-Moderate: NSAIDs (Ibuprofen, Naproxen) or Acetaminophen are first-line.",
              "Severe: Triptans (e.g., Almotriptan, Rizatriptan, Sumatriptan) are recommended when NSAIDs fail. Early intake is crucial.",
              "Nausea: Anti-emetics (e.g., Metoclopramide) may be added.",
            ],
          },
          {
            text: "Acute Treatment (Tension-Type): Simple analgesics (Acetaminophen, NSAIDs).",
          },
          {
            text: "Caution: Avoid Opioids and Butalbital-containing analgesics due to high risk of medication overuse headache.",
          },
        ],
      },
    ],
    warning: {
      heading: '"SNOOP" RED FLAGS (Refer Immediately)',
      items: [
        "Systemic symptoms: Fever, weight loss, or cancer history.",
        "Neurologic symptoms: Confusion, weakness, seizure, or abnormal exam.",
        'Onset: Sudden, abrupt, or "thunderclap" headache.',
        "Older: New onset headache in patient >50 years old.",
        "Pattern change: Progressive headache or change in frequency/severity.",
      ],
    },
    references: [
      {
        authors: "Werner J. Becker, MD, et al. (Canadian Family Physician)",
        year: "2015",
        title: "Guideline for primary care management of headache in adults",
      },
    ],
  },
  {
    slug: "migraine-management-protocol-philippine-neurologists",
    title: "Migraine Management Protocol (Philippine Neurologists)",
    category: "Chronic/Non-Communicable",
    authority: "Neurology Asia 2022",
    excerpt:
      "Diagnosis is primarily based on the ICHD-3 Criteria (International Classification of Headache Disorders).",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: "Standard: Diagnosis is primarily based on the ICHD-3 Criteria (International Classification of Headache Disorders).",
          },
          {
            text: "Neuroimaging: Cranial CT or MRI is often requested for patients with a long history of recurrent severe migraine (e.g., >3 years) to rule out secondary causes.",
          },
          {
            text: "Triggers: Common triggers include stress, sleep deprivation, and certain foods.",
          },
        ],
      },
      {
        heading: "2. Acute Treatment (Abortive)",
        bullets: [
          {
            text: "First-Line: NSAIDs (e.g., Naproxen, Ibuprofen) are the most preferred initial treatment for mild to moderate attacks.",
          },
          {
            text: "Second-Line: Triptans (e.g., Zolmitriptan, Sumatriptan) are used for moderate to severe attacks where NSAIDs fail.",
          },
          {
            text: "Adjunct: Anti-nausea medications (Anti-emetics) are recommended for patients experiencing vomiting or severe nausea.",
          },
        ],
      },
      {
        heading: "3. Preventive Treatment (Prophylaxis)",
        bullets: [
          { text: "Indication: Considered for frequent or disabling attacks." },
          {
            text: "Preferred Medications:",
            children: [
              "1. Topiramate (Anticonvulsant) - Most commonly prescribed.",
              "2. Beta-Blockers (e.g., Propranolol).",
              "3. Calcium Channel Blockers (e.g., Flunarizine).",
            ],
          },
        ],
      },
    ],
    warning: {
      heading: "WHEN TO IMAGE (Rule Out Secondary Causes)",
      items: [
        "Change in pattern: Significant increase in frequency or severity.",
        "Neurologic Deficits: Weakness, numbness, or confusion.",
        "Persistent Symptoms: Headache failing to respond to standard therapy.",
      ],
    },
    references: [
      {
        authors:
          "Artemio Agra Roxas Jr MD, et al. (Philippine General Hospital / The Medical City)",
        year: "2022",
        title:
          "The practice patterns of migraine management among neurologists in the Philippines (Neurology Asia)",
      },
    ],
  },
  {
    slug: "allergic-rhinitis-immunotherapy-protocol-psaai",
    title: "Allergic Rhinitis: Immunotherapy Protocol (PSAAI)",
    category: "Respiratory",
    authority: "PSAAI 2024",
    excerpt:
      "Immunotherapy is a therapeutic option for patients with Allergic Rhinitis and Bronchial Asthma who do not respond well to standard medication or want to alter the natural course of the disease.",
    sections: [
      {
        heading: "1. Indication",
        bullets: [
          {
            text: "Target Patient: Immunotherapy is a therapeutic option for patients with Allergic Rhinitis and Bronchial Asthma who do not respond well to standard medication or want to alter the natural course of the disease.",
          },
        ],
      },
      {
        heading: "2. Treatment Modes",
        bullets: [
          {
            text: "SCIT (Subcutaneous Immunotherapy): The most common method (used by 97% of Filipino allergists). It involves regular injections (allergy shots).",
          },
          {
            text: "SLIT (Sublingual Immunotherapy): An alternative method using drops or tablets under the tongue (used by 67% of allergists).",
          },
        ],
      },
      {
        heading: "3. Management Protocol",
        bullets: [
          {
            text: "Common Allergens: The most common triggers targeted are House Dust Mites (100% usage), followed by Cockroach, Animal Dander, and Pollen.",
          },
          {
            text: "Duration: The recommended duration for effective treatment is typically 3 to 5 years.",
          },
          {
            text: "Expected Relief: Most patients report feeling relief from symptoms within 6 to 8 months of starting therapy.",
          },
        ],
      },
    ],
    warning: {
      heading: "RISKS & SAFETY",
      items: [
        "Systemic Reactions: There is a risk of severe allergic reaction (anaphylaxis), especially with SCIT (injections).",
        "Drop-out: Compliance is a major challenge; patients often stop due to the long duration (3-5 years) or cost.",
      ],
    },
    references: [
      {
        authors: "Maria Carmela A. Kasala, MD, et al. (PSAAI)",
        year: "2024",
        title:
          "The Practice of Allergen Immunotherapy among Allergists in the Philippines (Philippine Journal of Allergy, Asthma and Immunology)",
      },
    ],
  },
  {
    slug: "acute-tonsillopharyngitis-protocol-pafp",
    title: "Acute Tonsillopharyngitis Protocol (PAFP)",
    category: "Respiratory",
    authority: "PAFP 2020",
    excerpt:
      'Most cases are viral (e.g., Adenovirus, Rhinovirus). Only 5-15% of adults have Group A Beta-Hemolytic Streptococcus (GABHS) or "Strep Throat".',
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: 'Etiology: Most cases are viral (e.g., Adenovirus, Rhinovirus). Only 5-15% of adults have Group A Beta-Hemolytic Streptococcus (GABHS) or "Strep Throat".',
          },
          {
            text: "Differentiation:",
            children: [
              "Viral Signs: Cough, coryza (runny nose), hoarseness, and conjunctivitis usually indicate a viral cause.",
              "Bacterial Signs (Strep): Sudden onset sore throat, fever, tonsillar exudates (white patches), and tender cervical lymph nodes. Absence of cough is a key predictor.",
            ],
          },
          {
            text: "Scoring: Use the Modified Centor Score to determine if antibiotics or testing is needed.",
            children: [
              "Score 0-1: Viral likely. No antibiotic/testing needed.",
              "Score 2-3: Request Rapid Antigen Test or Culture.",
              "Score 4: Empiric treatment may be considered.",
            ],
          },
        ],
      },
      {
        heading: "2. Management",
        bullets: [
          {
            text: "Viral Pharyngitis: Supportive care only.",
            children: [
              "Pain Relief: Paracetamol or Ibuprofen.",
              "Hydration: Saltwater gargles and increased fluid intake.",
            ],
          },
          {
            text: "Streptococcal Pharyngitis (Confirmed):",
            children: [
              "Goal: Prevent Rheumatic Fever and suppurative complications.",
              "Antibiotic of Choice: Penicillin V or Amoxicillin (standard course). Erythromycin/Clindamycin for penicillin-allergic patients.",
            ],
          },
          {
            text: "Rational Use: Do NOT prescribe antibiotics for viral sore throats to prevent resistance.",
          },
        ],
      },
    ],
    warning: {
      heading: "COMPLICATIONS (Refer Immediately)",
      items: [
        'Peritonsillar Abscess: Severe unilateral pain, trismus (lockjaw), "hot potato" voice, and uvula deviation.',
        "Airway Obstruction: Stridor, drooling, or difficulty breathing.",
        "Signs of Rheumatic Fever: Joint pain, new heart murmur, or rash.",
        "Severe Dehydration: Inability to swallow liquids.",
      ],
    },
    references: [
      {
        authors:
          "Daisy M. Medina, MD, et al. (Philippine Academy of Family Physicians)",
        year: "2020",
        title:
          "Diagnosis and Management of Acute Tonsillopharyngitis in Family Practice (PAFP Clinical Pathways)",
      },
    ],
  },
  {
    slug: "covid-19-clinical-management-protocol-doh",
    title: "COVID-19 Clinical Management Protocol (DOH Living CPG)",
    category: "Respiratory",
    authority: "DOH 2023",
    excerpt: "RT-PCR is the standard for confirmation.",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          { text: "Gold Standard: RT-PCR is the standard for confirmation." },
          {
            text: "Rapid Antigen Tests: Recommended for symptomatic patients within 7 days of onset (Sensitivity ≥80%, Specificity ≥97%).",
          },
          {
            text: "Screening: Symptom check for fever, cough, dyspnea, sore throat, or anosmia/ageusia within the past 14 days.",
          },
        ],
      },
      {
        heading: "2. Pharmacologic Management (Adults)",
        bullets: [
          {
            text: "Mild to Moderate (High Risk for Progression):",
            children: [
              "Nirmatrelvir + Ritonavir (Paxlovid): Recommended for unvaccinated, non-hospitalized patients within 5 days of onset.",
              "Molnupiravir: Alternative for non-oxygen requiring patients within 5 days of onset.",
              "Remdesivir: Suggested for patients with risk factors (e.g., >60y, comorbidities).",
            ],
          },
          {
            text: "Severe to Critical:",
            children: [
              "Corticosteroids: Dexamethasone (6mg/day for 10 days) is the standard of care.",
              "Immunomodulators: Add Tocilizumab or Baricitinib to steroids for patients showing rapid respiratory deterioration or increasing oxygen needs.",
              "Anticoagulation: Prophylactic dose is suggested for hospitalized moderate-critical patients.",
            ],
          },
        ],
      },
      {
        heading: "3. What NOT to Use (Strong Recommendation Against)",
        bullets: [
          {
            text: "Ivermectin, Hydroxychloroquine, Azithromycin, Oseltamivir, Colchicine, and Steam Inhalation are NOT recommended for treatment or prevention.",
          },
        ],
      },
    ],
    warning: {
      heading: "WARNING SIGNS & RISK FACTORS",
      items: [
        "Severe Respiratory Distress: Hypoxemia (SpO2 < 94%) requiring oxygen.",
        "High Risk for Progression: Age >60 years, Obesity, Diabetes, Hypertension, CKD, or Immunocompromised state.",
        "Rapid Deterioration: Increasing inflammation (CRP) or rapid escalation of oxygen support.",
      ],
    },
    references: [
      {
        authors:
          "Department of Health (DOH), PSMID, PCP, and Philippine COVID-19 Living CPG Task Force",
        year: "2023",
        title: "Philippine COVID-19 Living Clinical Practice Guidelines",
      },
    ],
  },
  {
    slug: "influenza-management-protocol-who-2024",
    title: "Influenza Management Protocol (WHO 2024)",
    category: "Respiratory",
    authority: "WHO 2024",
    excerpt:
      "Sudden onset of cough, headache, muscle/joint pain, severe malaise, sore throat, and rhinorrhea, with or without fever.",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: "Clinical Presentation: Sudden onset of cough, headache, muscle/joint pain, severe malaise, sore throat, and rhinorrhea, with or without fever.",
          },
          {
            text: "Diagnosis:",
            children: [
              "Gold Standard: RT-PCR is the preferred method for confirmation.",
              "Rapid Tests: NAATs (molecular assays) or Digital Immunoassays (DIAs) are suggested for high-risk patients to guide treatment decisions.",
            ],
          },
          {
            text: "Severity Classification:",
            children: [
              "Non-Severe: Uncomplicated illness where symptoms typically resolve within a week.",
              "Severe: Presence of sepsis, severe pneumonia, ARDS, or exacerbation of chronic medical conditions requiring hospitalization.",
            ],
          },
        ],
      },
      {
        heading: "2. Management (Non-Severe)",
        bullets: [
          {
            text: "Low-Risk Patients: Symptomatic care only. DO NOT administer Oseltamivir, Zanamivir, or Baloxavir for routine non-severe cases in healthy individuals.",
          },
          {
            text: "High-Risk Patients (e.g., >65 years, chronic disease):",
            children: [
              "Baloxavir: Conditional recommendation for use in high-risk patients if given within 48 hours of onset.",
            ],
          },
          {
            text: "Antibiotics: NOT RECOMMENDED for non-severe influenza unless there is a confirmed bacterial co-infection.",
          },
        ],
      },
      {
        heading: "3. Management (Severe)",
        bullets: [
          {
            text: "Antiviral of Choice: Oseltamivir is suggested for all patients with confirmed or suspected severe influenza. Start treatment as early as possible (within 2 days).",
          },
          {
            text: "Adjunctive Therapies:",
            children: [
              "Corticosteroids: NOT RECOMMENDED (Conditional recommendation against use).",
              "Macrolides: NOT RECOMMENDED as immunomodulatory therapy.",
            ],
          },
        ],
      },
    ],
    warning: {
      heading: "RISK FACTORS & SEVERE SIGNS",
      items: [
        "High Risk Groups: Age ≥65 years, immunocompromised, cardiovascular disease, or chronic respiratory disease.",
        "Severe Complications: Sepsis, septic shock, or multi-organ failure.",
        "Respiratory Failure: Acute Respiratory Distress Syndrome (ARDS) or need for mechanical ventilation.",
      ],
    },
    references: [
      {
        authors: "World Health Organization (WHO)",
        year: "2024",
        title: "Clinical practice guidelines for influenza",
      },
    ],
  },
  {
    slug: "adult-community-acquired-pneumonia-protocol-philhealth-2024",
    title:
      "Adult Community-Acquired Pneumonia (ACAP) Protocol (PhilHealth 2024)",
    category: "Respiratory",
    authority: "PhilHealth 2024",
    excerpt:
      "History of cough (24 hours to <2 weeks) PLUS abnormal vitals (RR ≥30, HR >125, or fever/hypothermia) AND abnormal chest findings (crackles, wheezing, or diminished breath sounds).",
    sections: [
      {
        heading: "1. Assessment & Diagnosis",
        bullets: [
          {
            text: "Clinical Signs: History of cough (24 hours to <2 weeks) PLUS abnormal vitals (RR ≥30, HR >125, or fever/hypothermia) AND abnormal chest findings (crackles, wheezing, or diminished breath sounds).",
          },
          {
            text: "Imaging: Chest X-ray is required for all suspected cases. Routine CT scans are NOT recommended.",
          },
          {
            text: "Risk Stratification:",
            children: [
              "Low Risk: Stable vitals, no altered mental state, stable/no comorbidities. Treat as outpatient.",
              "Moderate/High Risk: Unstable vitals, altered mental state, decompensated comorbidities (e.g., uncontrolled diabetes, CHF, COPD), or signs of sepsis. Requires Hospital Admission.",
            ],
          },
        ],
      },
      {
        heading: "2. Management (Empiric Therapy)",
        bullets: [
          {
            text: "Low Risk (Outpatient): Amoxicillin (1g TID) OR Azithromycin/Clarithromycin. If comorbidities are present: Co-amoxiclav or Cefuroxime +/- Macrolide.",
          },
          {
            text: "Moderate/High Risk (Inpatient): Non-Pseudomonal Beta-lactam (e.g., Ceftriaxone, Ampicillin-Sulbactam) PLUS a Macrolide (Azithromycin/Clarithromycin).",
          },
          {
            text: "MDRO Risk:",
            children: [
              "MRSA Risk: Add Vancomycin or Linezolid.",
              "Pseudomonas Risk: Use Piperacillin-Tazobactam, Cefepime, or Ceftazidime instead of standard beta-lactam.",
            ],
          },
        ],
      },
      {
        heading: "3. Prevention",
        bullets: [
          {
            text: "Vaccination: Influenza vaccination for all patients and Pneumococcal vaccination for adults ≥50 years old.",
          },
          { text: "Lifestyle: Smoking cessation." },
        ],
      },
    ],
    warning: {
      heading: "ADMISSION CRITERIA & DANGER SIGNS",
      items: [
        "Altered Mental State (Acute onset).",
        "Hemodynamic Instability: Systolic BP <90 mmHg or severe tachycardia (>125 bpm).",
        "Severe Respiratory Distress: RR ≥30 bpm or need for mechanical ventilation.",
        "Decompensated Comorbidities: Uncontrolled diabetes, active malignancy, worsening CHF/COPD, or renal failure.",
      ],
    },
    references: [
      {
        authors:
          "Philippine Health Insurance Corporation (PhilHealth), with PSMID, PCP, and PAFP",
        year: "2024",
        title:
          "PhilHealth Circular No. 2024-0027: Quality Standards on the Diagnosis, Management, and Prevention of Adult Community-Acquired Pneumonia (ACAP)",
      },
    ],
  },
];

/** Category chips, in the order the hub's cards first introduce them. */
export const PROTOCOL_CATEGORIES: ProtocolCategory[] = [
  "General",
  "Respiratory",
  "Gastrointestinal",
  "Chronic/Non-Communicable",
];

export function getProtocolBySlug(slug: string): MedicalProtocol | undefined {
  return MEDICAL_PROTOCOLS.find((protocol) => protocol.slug === slug);
}

// --- Capability showcase -----------------------------------------------------

/**
 * The hub's framing.
 *
 * The page is a showcase of how a consultation is governed, not a textbook, so
 * the headline is a claim about the product and the subtext names the bodies
 * that back it. Every body named here appears in at least one protocol's
 * `references` below, which is what keeps the claim checkable.
 */
export const MED_HUB_HERO = {
  headline: "Evidence-Based Care, Backed by Philippine & Global Standards",
  subtext:
    "Every consultation on BayanHealth follows clinical practice guidelines from the DOH, PhilHealth, PAFP, and WHO.",
} as const;

/**
 * The authority row under the hero.
 *
 * "PhilHealth Standards", not "PhilHealth Formularies": the PhilHealth document
 * cited here is Circular 2024-0027, a quality standard for diagnosis and
 * management. No formulary is cited, and naming one would claim a source the
 * hub does not have.
 */
export const AUTHORITY_BADGES: string[] = [
  "DOH CPGs",
  "PhilHealth Standards",
  "WHO Protocols",
  "PAFP Standards",
];

export interface ProtocolFilter {
  id: string;
  label: string;
  /** `null` matches every protocol. */
  category: ProtocolCategory | null;
}

/** The filter pills above the grid, in display order. */
export const PROTOCOL_FILTERS: ProtocolFilter[] = [
  { id: "all", label: "All Protocols", category: null },
  { id: "respiratory", label: "Respiratory", category: "Respiratory" },
  {
    id: "gastrointestinal",
    label: "Gastrointestinal",
    category: "Gastrointestinal",
  },
  {
    id: "chronic",
    label: "Chronic & Non-Communicable",
    category: "Chronic/Non-Communicable",
  },
  { id: "general", label: "General", category: "General" },
  { id: "pediatric", label: "Pediatric Care", category: "Pediatric Care" },
];

/** Shown when a filter matches nothing — currently only "Pediatric Care". */
export const PROTOCOL_EMPTY_STATE = {
  heading: "No protocols published here yet",
  body: "This section is still being authored. Check the other categories — those are complete.",
} as const;

/** Card footer call to action, which opens the workflow drawer. */
export const PROTOCOL_PREVIEW_LABEL = "Preview Protocol Workflow";

/**
 * The three steps the drawer walks through.
 *
 * Written against `architecture/PRODUCT_STATUS.md` rather than around it. The
 * intake really does ask explicit emergency-screening questions; the doctor
 * really does write the assessment, and the AI never does — so step 2 says the
 * guideline is surfaced *to the doctor* rather than that anything is diagnosed
 * automatically; prescriptions and Filipino/English education material really
 * have been released to patients. A drawer that promised automated diagnosis
 * would be describing a product that does not exist.
 */
export const WORKFLOW_STEPS = [
  {
    number: 1,
    title: "Intake",
    subtitle: "Triage check for red flags",
    description:
      "Before the consultation starts, the intake form asks the emergency-screening questions. These are the red flags it looks for in this protocol:",
  },
  {
    number: 2,
    title: "Clinical decision",
    subtitle: "CPG-aligned guidance for the doctor",
    description:
      "The doctor sees this guideline while writing the assessment. The doctor writes the diagnosis — the AI does not.",
  },
  {
    number: 3,
    title: "Patient deliverable",
    subtitle: "Prescription and home care instructions",
    description:
      "After the doctor signs off, the patient receives the digital prescription and the care summary — written in Filipino and English.",
  },
] as const;

/** Label on the drawer link through to the full protocol text. */
export const PROTOCOL_READ_FULL_LABEL = "Read the full protocol";

/** Label on the drawer's booking call to action. */
export const PROTOCOL_BOOK_LABEL = "Book a consult using this protocol";

/**
 * The safeguard pill on each card.
 *
 * The count is `warning.items.length` — the protocol's own referral triggers —
 * so the number on the card is the number of checks the drawer then lists. It
 * is never a rounded-up marketing figure.
 */
export function safeguardSummary(protocol: MedicalProtocol): string {
  const count = protocol.warning.items.length;
  return `Built-in Triage Safeguards (${count} Red-Flag ${
    count === 1 ? "Check" : "Checks"
  })`;
}
