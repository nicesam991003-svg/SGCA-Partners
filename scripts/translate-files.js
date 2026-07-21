const fs = require('fs');
const path = require('path');

const jpTranslations = {
  // Common Nav & Header
  'About Us': '会社紹介',
  'Management Systems': 'マネジメントシステム認証',
  'ISO 9001 (Quality)': 'ISO 9001（品質）',
  'ISO 14001 (Environment)': 'ISO 14001（環境）',
  'ISO 45001 (Health & Safety)': 'ISO 45001（労働安全衛生）',
  'ISO 13485 (Medical Devices)': 'ISO 13485（医療機器）',
  'ISO 19443 (Nuclear)': 'ISO 19443（原子力）',
  'Product Certification': '製品認証',
  'NRTL (North America)': '米国NRTL・カナダ製品安全認証',
  'CE Marking (Europe)': 'CEマーキング（欧州）',
  'KC Certification (Korea)': 'KC認証（韓国）',
  'Specialized Sectors': '専門分野',
  'Medical Cybersecurity': '医療機器サイバーセキュリティ',
  'Field Evaluation': '産業用機械 現場試験',
  'Ex Quality Systems': '防爆品質マネジメントシステム',
  'Cybersecurity Regulations': '最新サイバーセキュリティ規制',
  'Insights': 'インサイト',

  // Common Footer
  'Representative Phone': '代表電話',
  'Email': 'Eメール',
  'Business Registration No.': '事業者登録番号',
  'Managing Partner: Sangwoo Sim': '代表パートナー：Sangwoo Sim',
  'Business Registration: 456-37-01417': '事業者登録番号：456-37-01417',
  'Business Reg No: 456-37-01417': '事業者登録番号：456-37-01417',
  'Managing Partner: Sang-woo Sim': '代表パートナー：Sang-woo Sim',

  // index-en.html specific
  'Navigating Regulatory<br>Barriers for Innovation': '医療機器イノベーションにおける<br>規制上の課題を克服',
  'From FDA and EU MDR compliance to pre/post-market cybersecurity, we ensure the safest path for your healthcare innovations.': 'FDA要求事項およびEU MDRへの適合支援から市販前後のサイバーセキュリティ対応まで、より安全なヘルスケア・イノベーションをサポートします。',
  'Accelerating Global<br>Market Access': 'グローバルな産業用機械市場への<br>参入プロセスを加速',
  'Realize seamless entry into international markets through expert North American Field Evaluation and CE/UKCA machinery compliance.': '北米のフィールド評価ならびにEU・英国の機械関連法規およびCE/UKCA要求事項への適合支援を通じて、迅速かつ円滑な海外市場参入を支援します。',
  'Uncompromising Safety for<br>Extreme Environments': '過酷な環境に対応する<br>厳格な安全基準',
  'Prove excellence with ATEX, IECEx, and NRTL-Ex conformity assessments backed by ISO/IEC 80079-34 quality system audits.': 'ATEX、IECEx、NRTL-Ex適合性評価およびISO/IEC 80079-34に基づく品質マネジメントシステム審査を通じ、高水準の防爆安全適合を実証します。',
  'Ensuring Nuclear Safety &<br>Supply Chain Integrity': '原子力安全と<br>サプライチェーンの完全性確保',
  'Build trust in critical national infrastructure through ISO 19443 quality management and rigorous cybersecurity frameworks.': 'ISO 19443に基づく原子力品質マネジメントおよび高度なサイバーセキュリティ体系の構築により、重要インフラ産業の信頼性をさらに向上させます。',
  'Specialized Industry Sectors': '特化産業分野',
  'Ensuring absolute regulatory compliance in the most demanding environments.': '難易度の高い要求事項が求められる環境においても、確実な規制適合を支援します。',
  'Medical Devices': '医療機器',
  'Nuclear Safety': '原子力安全',
  'Industrial Machinery': '産業用機械',
  'FDA and EU MDR compliance, pre/post-market cybersecurity, and IEC 62304 standard consulting.': 'FDA要求事項およびEU MDRへの適合支援、市販前後のサイバーセキュリティ、IEC 62304に基づくプロセスの適合支援。',
  'ISO 19443 nuclear quality management systems encompassing supply chain integrity.': 'サプライチェーンの完全性をカバーするISO 19443原子力品質マネジメントシステム。',
  'North American Field Evaluation, CE/UKCA machinery regulations, and cybersecurity requirements.': '北米のフィールド評価、CE/UKCA機械規則への適合、およびサイバーセキュリティ要件への対応。',
  'Latest Regulatory Updates': '最新の規制トレンド',
  'Stay informed with the latest regulatory trends and expert analysis reports across key global industries.': '世界の主要産業における最新の規制動向と専門家による分析レポートをご覧いただけます。',
  'View All Insights': 'インサイト一覧',

  // company-intro-en.html specific
  'About Us | SGCA Partners': '会社紹介 | SGCA Partners',
  'A core essence that underpins the safety of high-risk industries,<br><span>SGCA Partners is a \'Risk Management\' specialist firm based on global standards.</span>': '高リスク産業の安全を貫く一つの本質、<br><span>SGCA Partnersはグローバル基準の「リスクマネジメント（Risk Management）」専門企業です。</span>',
  'SGCA Partners (Smart Global Conformity Assessment Partners) is a professional conformity assessment consulting firm specializing in system and product certification, and global cybersecurity regulations for high-risk sectors requiring strict safety and reliability, such as medical devices, industrial machinery, and nuclear energy. Based on our deep insight into \'Risk Management\', the core of all high-risk industries, we prove the safety and trust of our clients.': 'SGCA Partners（Smart Global Conformity Assessment Partners）は、医療機器、産業機械、原子力など、高度な安全性と信頼性が求められる分野に特化した適合性評価・規制コンサルティング会社です。マネジメントシステム認証、製品認証・適合性評価、およびグローバルなサイバーセキュリティ規制への対応を支援します。あらゆる高リスク産業の中核となるリスクマネジメントに関する深い知見に基づき、お客様の製品およびシステムの安全性と信頼性の向上を支援します。',
  'Expertise & Services': '専門性とサービス',
  'We provide optimal compliance solutions based on deep expertise and rich experience.': '専門性と経験に基づき、最適なコンプライアンスソリューションを提供します。',
  'Core Competency: Integrated Risk Management Solution': 'コアコンピテンシー：統合リスクマネジメント（Risk Management）ソリューション',
  'Medical devices (ISO 14971), industrial machinery (ISO 12100), and nuclear systems share one essence: \'Risk-Based Thinking\', although their regulatory mechanisms differ. SGCA Partners provides a differentiated risk management methodology that identifies, evaluates, and controls potential risk factors throughout the entire process from product design to the supply chain.': '医療機器（ISO 14971）、産業機械（ISO 12100）および原子力システムでは、適用される法規制や規格は異なりますが、いずれもリスクベース思考（Risk-Based Thinking）を共通の基本原則としています。SGCA Partners独自のリスクマネジメント手法により、製品設計からサプライチェーン全般にわたって潜在的なリスク要因を特定、評価、制御します。',
  'High-Risk Industry Expertise': '高リスク分野特化の専門性',
  'EU MDR/IVDR, US FDA regulatory compliance, product risk management based on ISO 14971, and preemptive cybersecurity framework construction for connected medical devices.': 'EU MDR/IVDRおよび米国FDA規制適合、ISO 14971に基づく製品リスク管理、ならびにコネクテッド医療機器向けの先制的なサイバーセキュリティフレームワークの構築支援。',
  'Machine and explosion-proof product certification complying with global safety standards (CE, NRTL, etc.), Risk Assessment, and industrial control system cybersecurity response for smart manufacturing environments.': 'グローバル安全基準（CE、NRTLなど）に適合する機械および防爆製品認証、リスクアセスメント（Risk Assessment）、ならびにスマート製造環境のための産業用制御システムサイバーセキュリティ対応。',
  'Support for nuclear supply chain and system regulations requiring the highest level of safety and quality assurance.': '最高レベルの安全性と品質保証が求められる原子力サプライチェーンおよびシステム規制への対応支援。',
  'Comprehensive Compliance': '包括的なコンプライアンス',
  'We provide an optimal integrated strategy that penetrates the entire process from system certification (ISO 9001, 14001, 45001, 13485, ISO 19443, etc.) proving organizational reliability, to product certification and cybersecurity response for overcoming global market barriers.': '組織の信頼性を証明する system 認証...?',
  'We provide an optimal integrated strategy that penetrates the entire process from system certification (ISO 9001, 14001, 45001, 13485, ISO 19443, etc.) proving organizational reliability, to product certification and cybersecurity response for overcoming global market barriers.': '組織の信頼性を証明するシステム認証（ISO 9001、14001、45001、13485、ISO 19443など）から、グローバル市場の障壁を克服するための製品認証およびサイバーセキュリティ対応まで、プロセス全体を貫く最適な統合戦略を提供します。',
  'Smart & Global Compliance': 'スマート＆グローバル・コンプライアンス',
  'Based on over 25 years of rich practical experience and a global network, we simplify complex technical regulations and demanding risk management processes to help clients settle in the global market as quickly and safely as possible.': '25年以上の豊富な実務経験とグローバルネットワークに基づき、複雑な技術規制や厳しいリスクマネジメントプロセスを簡素化し、お客様がグローバル市場に迅速かつ安全に進出できるよう支援します。',
  '"In the midst of rapidly changing technical standards and cyber threats, regulatory response is not a barrier, but the ultimate competitive advantage to lead the global market. SGCA Partners will be a reliable partner so that clients\' businesses can grow sustainably on global safety and security standards."': '「急速に変化する技術基準やサイバー脅威の中で、規制対応は障壁ではなく、グローバル市場をリードするための究極の競争優位性です。SGCA Partnersは、お客様のビジネスがグローバルな安全・セキュリティ基準に基づいて持続可能に成長できるよう、信頼できるパートナーとなります。」',
  'SGCA Partners Team': 'SGCA Partners チーム',

  // management-system-en.html specific
  'Management System Certification | SGCA Partners': 'マネジメントシステム認証 | SGCA Partners',
  'Management System Certification': 'マネジメントシステム認証',
  'In-depth expertise in foundational and specialized international standards.': '基盤および特化された国際規格に関する深い専門知識。',
  'ISO 9001 <span class="cert-name">(Quality Management)</span>': 'ISO 9001 <span class="cert-name">（品質マネジメント）</span>',
  '"The essential benchmark for quality demanded by the global market."': '「グローバル市場から求められる品質の必須ベンチマーク」',
  'ISO 9001 is the international standard for quality management systems applicable to any industry. Beyond mere product quality, it certifies that an organization has established systematic processes to consistently meet customer requirements and drive continuous improvement.': 'ISO 9001は、あらゆる産業分野に適用可能な品質マネジメントシステム（QMS）の国際規格です。単なる製品の品質向上にとどまらず、組織が顧客の要求事項を一貫して満たし、継続的な改善を達成するための体系的なプロセスを構築していることを認証します。',
  'Key Benefits': '主なメリット',
  'Scope': '対象範囲',
  'All industries (manufacturing, services, public sectors, etc.)': 'すべての産業（製造、サービス、公共部門など）',
  'Core Services': '主なサービス',
  'QMS gap analysis, process design and documentation support, internal auditor training, and certification audit readiness.': 'QMS' + 'のギャップ分析...?', // Let's write simply:
  'QMS gap analysis, process design and documentation support, internal auditor training, and certification audit readiness.': 'QMSのギャップ分析、プロセス設計および文書化支援、内部監査員研修、ならびに認証審査への対応支援。',

  'ISO 14001 <span class="cert-name">(Environmental Management)</span>': 'ISO 14001 <span class="cert-name">（環境マネジメント）</span>',
  '"A strategic necessity for sustainable growth and the cornerstone of ESG management."': '「持続可能な成長のための戦略的必須事項であり、ESG経営の礎石」',
  'This standard defines the management framework required to minimize the environmental impact of an organization\'s activities, products, and services. It is a management strategy that encompasses resource efficiency and regulatory compliance beyond basic environmental protection.': '本規格は、組織の活動、製品、サービスによる環境影響を最小限に抑えるために必要なマネジメントフレームワークを定義しています。単なる環境保護を超え、資源効率の向上や法規制遵守を包含する経営戦略です。',
  'EMS gap analysis, environmental aspect evaluation, legal compliance checks, and EMS system construction.': 'EMSのギャップ分析、環境側面評価、法的適合性確認、およびEMSシステム構築。',

  'ISO 45001 <span class="cert-name">(Occupational Health & Safety)</span>': 'ISO 45001 <span class="cert-name">（労働安全衛生マネジメント）</span>',
  '"The safety of your workforce is your company\'s greatest asset."': '「従業員の安全こそが、企業の最大の資産です。」',
  'The international standard for preventing occupational injuries by identifying and managing workplace hazards. Its purpose is to create a safe work environment by continuously improving an organization\'s health and safety performance.': '職場の危険源を特定・管理し、労働災害を予防するための国際規格です。組織の安全衛生パフォーマンスを継続的に改善し、安全な労働環境を構築することを目的としています。',
  'OH&S hazard identification and risk assessment, safety manual and procedure design, and compliance auditing.': '労働安全衛生の危険源特定およびリスクアセスメント、安全マニュアルおよび規定類の構築支援、ならびに法的適合性監査。',

  'ISO 13485 <span class="cert-name">(Medical Device Quality)</span>': 'ISO 13485 <span class="cert-name">（医療機器品質マネジメント）</span>',
  '"The mandatory gateway for entering the global medical device market."': '「グローバル医療機器市場に参入するための必須のゲートウェイ」',
  'A quality management standard specifically tailored for the medical device industry. It evaluates the ability to ensure safety and effectiveness throughout the entire product lifecycle, from design and development to production, installation, and associated services.': '医療機器業界向けに特化された品質マネジメント規格です。設計・開発から生産、設置、および関連サービスに至る製品ライフサイクル全体にわたり、安全性と有効性を確保する能力を評価します。',
  'Medical QMS design, software validation support, technical file alignment, and MDR/IVDR integrated consulting.': '医療機器QMSの構築、ソフトウェアバリデーション支援、技術文書の整合性確保、およびMDR/IVDR統合コンサルティング。',

  'ISO 19443 <span class="cert-name">(Nuclear Industry Quality)</span>': 'ISO 19443 <span class="cert-name">（原子力産業品質マネジメント）</span>',
  '"Committed to the world\'s highest standards of nuclear safety and quality."': '「世界最高水準の原子力安全と品質へのコミットメント」',
  'Based on ISO 9001, this standard adds specific nuclear industry requirements to strengthen safety and quality throughout the supply chain. It focuses on IT security, supply chain management, and the cultivation of a safety culture.': 'ISO 9001をベースに、原子力産業特有の要求事項を追加し、サプライチェーン全体の安全と品質を強化するための規格です。ITセキュリティ、サプライチェーン管理、および安全文化の醸成に焦点を当てています。',
  'Nuclear safety culture evaluation, supply chain audit readiness, nuclear QMS manual development, and implementation consulting.': '原子力安全文化の評価、サプライチェーン監査への対応準備、原子力QMSマニュアルの作成、および構築コンサルティング。',

  // management-system-en.html specific list items (JP)
  'Prove high reliability, including the prevention of counterfeit or fraudulent items (CFSI) and IT security for critical components.': '重要部品の模倣品・不正品（CFSI）の防止やITセキュリティを含め、高い信頼性を証明します。',
  'Manage risks associated with increasingly complex global environmental laws and Carbon Border Adjustment Mechanisms (CBAM).': 'ますます複雑化する世界的な環境法や炭素国境調整措置（CBAM）に関連するリスクを管理します。',
  'Demonstrate compliance with strengthened safety and health regulations, such as the Serious Accidents Punishment Act.': '重大災害処罰法など、強化された安全衛生法規制への適合性を実証します。',
  'Successfully embed the \'Safety First\' principle, unique to the nuclear industry, across the entire organization.': '原子力産業特有の「安全第一」の原則を組織全体に深く浸透させます。',
  'Enhance brand value by demonstrating quality management capabilities that align with international standards.': '国際規格に準拠した品質マネジメント能力を実証することで、ブランド価値を向上させます。',
  'Meet the international quality certification requirements essential for exporting nuclear power technology.': '原子力技術の輸出に不可欠な国際品質認証要件を満たします。',
  'Achieve tangible reductions in operating costs through waste minimization and improved energy efficiency.': '廃棄物の最小化とエネルギー効率の向上により、運営コストを実質的に削減します。',
  'Meet mandatory requirements and secure advantage points in public and private procurement processes.': '公共および民間の調達プロセスにおける必須要件を満し、優位性を確保します。',
  'Secure external credibility by meeting demands for carbon neutrality and ESG information disclosure.': '炭素中立やESG情報開示の要求に応えることで、対外的な信頼性を確保します。',
  'Prevent human and material losses and maintain productivity through systematic risk assessments.': '体系的なリスク評価により、人的・物的損失を防ぎ、生産性を維持します。',
  'Attract top talent and improve labor relations by fostering a culture that prioritizes safety.': '安全を最優先する文化を醸成することで、優秀な人材を獲得し、労使関係を改善します。',
  'Meet the minimum qualification requirements demanded by international buyers and distributors.': '海外のバイヤーやディストリビューターが求める最小限の適格性要件を満たします。',
  'Reduce product recall risks through rigorous risk management and validation processes.': '厳格なリスク管理と検証プロセスを通じて、製品回収（リコール）リスクを低減します。',
  'Reduce costs by eliminating redundant tasks and optimizing core business processes.': '重複業務を排除し、中核業務プロセスを最適化することでコストを削減します。',
  'Establish a core foundation for compliance with EU MDR/IVDR and US FDA regulations.': 'EU MDR/IVDRおよび米国FDA規制への適合のための重要な基盤を構築します。',

  'Global Nuclear Market Leadership': '世界原子力市場でのリーダーシップ',
  'Resource & Energy Optimization': '資源とエネルギーの最適化',
  'Guaranteed Quality Consistency': '品質の一貫性の保証',
  'Proactive Regulatory Response': '先制的な規制対応',
  'Global Regulatory Compliance': 'グローバル規制への適合',
  'Global Partnership Expansion': 'グローバルパートナーシップの拡大',
  'Competitive Edge in Tenders': '入札における競争優位性の確保',
  'Safety Culture Integration': '安全文化の定着',
  'Building Customer Trust': '顧客信頼の構築',
  'Operational Efficiency': '業務効率の向上',
  'Legal Risk Mitigation': '法的リスクの軽減',
  'Reduced Accident Rates': '労働災害率の低減',
  'Trusted Corporate Culture': '信頼される企業文化',
  'Supply Chain Integrity': 'サプライチェーンの健全性',

  // product-certification-en.html specific
  'Product Certification | SGCA Partners': '製品認証 | SGCA Partners',
  'Facilitating global market entry for industrial and high-tech equipment.': '産業用および先端機器の円滑なグローバル市場進出を支援。',
  'NRTL <span class="cert-name">(North American Product Safety)</span>': 'NRTL <span class="cert-name">（北米製品安全）</span>',
  '"The definitive safety assurance for entering US and Canadian markets."': '「米国およびカナダ市場に参入するための決定的な安全保証」',
  'NRTL (Nationally Recognized Testing Laboratory) is a system where product safety is certified by labs recognized by the US Occupational Safety and Health Administration (OSHA). It is essential for electrical/electronic products and industrial machinery exported to the US and Canada.': 'NRTL（Nationally Recognized Testing Laboratory：国家認定試験機関）とは、米国労働安全衛生局（OSHA）によって認定された試験機関が製品の安全性を認証する制度です。米国およびカナダへ輸出される電気・電子製品や産業用機械には不可欠です。',
  'Specialized Services from SGCA Partners': 'SGCA Partnersの特化サービス',
  'Design Review': '設計レビュー',
  'AHJ Approval Support': 'AHJ承認の取得支援',
  'Regulatory Transition Support': '規制移行期の対応支援',
  'Declaration of Conformity (DoC) Guidance': '自己適合宣言（DoC）ガイダンス',
  'Pre-audit Technical Services': '事前監査テクニカルサービス',
  'Post-Certification Maintenance': '認証取得後の維持管理',
  'Regulatory Hub for Inbound Market': 'インバウンド市場의 規制ハブ...?',
  'Regulatory Hub for Inbound Market': 'インバウンド市場の規制ハブ',
  'Industrial control panels, IT equipment, medical devices, laboratory equipment, and explosion-proof (Ex) devices.': '産業用制御盤、IT機器、医療機器、実験室設備、および防爆（Ex）機器。',

  'CE Marking <span class="cert-name">(European Union Compliance)</span>': 'CEマーキング <span class="cert-name">（欧州連合適合）</span>',
  '"Your trade passport to the markets of 30 European nations."': '「欧州30カ国の市場へ参入するための貿易パスポート」',
  'The CE marking signifies that products circulated within the European Economic Area (EEA) comply with all applicable EU directives and regulations related to safety, health, and environmental protection. It is a mandatory requirement for European market access.': 'CEマーキングは、欧州経済領域（EEA）内で流通する製品が、安全、健康、環境保護に関連するすべての適用可能なEU指令および規則に適合していることを示します。欧州市場へ参入するための必須要件です。',
  'Machinery (MD/MR), Low Voltage (LVD), Electromagnetic Compatibility (EMC), Medical Devices (MDR), and Cybersecurity (CRA/RED).': '機械（MD/MR）、低電圧（LVD）、電磁適合性（EMC）、医療機器（MDR）、およびサイバーセキュリティ（CRA/RED）。',

  'KC Certification <span class="cert-name">(Korea Certification)</span>': 'KC認証 <span class="cert-name">（韓国国家統合認証）</span>',
  '"Smart regulatory guidance for entering the Korean market."': '「韓国市場へ参入するためのスマートな規制ガイダンス」',
  'KC Certification is the integrated national certification system for safety, health, environment, and quality of products distributed in South Korea. Compliance is mandatory under laws such as the Electrical Appliances and Consumer Products Safety Control Act and the Radio Waves Act.': 'KC認証は、韓国国内で流通する製品の安全、保健、環境、品質などを証明する国家統合認証制度です。「電気用品及び生活用品安全管理法」や「電波法」などの法律に基づき、適合性評価が義務付けられています。',
  'Electrical appliances, consumer goods, children\'s products, and broadcasting/communication equipment (wireless devices, etc.).': '電気用品、生活用品、子供向け製品、および放送通信機器（無線機器など）。',

  // product-certification-en.html descriptions (JP)
  'A cost-effective alternative to full NRTL listing, providing rapid on-site safety inspections to facilitate customs clearance and immediate installation.': '通常のNRTL登録（Listing）に代わる費用対効果の高い方法であり、設置現場での迅速な安全検査により、通関や即時設置を容易にします。',
  'Expert Technical Construction File (TCF) preparation for the upcoming Machinery Regulation and Cyber Resilience Act (CRA) mandatory from 2026.': '2027年以降に本格適用される新しい機械規則やサイバーレジリエンス法（EU CRA）に向け、専門的な技術構成ファイル（TCF）の作成を支援します。',
  'Proactive identification of non-conformities with North American standards (UL, CSA, NFPA) and provision of expert modification guidelines.': '北米規格（UL、CSA、NFPA）への不適合を事前に特定し、専門的な修正ガイドラインを提供します。',
  'Real-time resolution of language barriers and regulatory misinterpretations for international manufacturers exporting to South Korea.': '海外メーカーが韓国へ輸出する際に直面する言語の壁や規制の誤解を、リアルタイムで解決します。',
  'Support for periodic audits and expert guidance on labeling modifications required by ongoing legislative updates.': '定期的な審査への対応や、継続的な法改正に伴い必要となる表示（Labeling）修正について、専門的なガイダンスを提供します。',
  'Specialized guidance on complex testing procedures and the authoring of comprehensive Risk Assessment reports.': '複雑な試験手続きや、包括的なリスクアセスメント（Risk Assessment）レポートの作成について、専門的な指導を行います。',

  // specialized-sectors-en.html specific
  'Specialized Sectors | SGCA Partners': '専門分野 | SGCA Partners',
  'Advanced regulatory compliance solutions for extreme environments and cybersecurity.': '過酷な環境やサイバーセキュリティに対応する、先進的な規制適合ソリューション。',
  'Medical Device Cybersecurity <span class="cert-name">(FDA & EU MDR)</span>': '医療機器サイバーセキュリティ <span class="cert-name">（FDAおよびEU MDR）</span>',
  '"Robust security guidance for the digital healthcare era as demanded by global markets."': '「グローバル市場から求められる、デジタルヘルスケア時代の堅牢なセキュリティガイダンス」',
  'As medical devices become more connected, cybersecurity has become a critical regulatory requirement. FDA (eStar) and EU MDR demand rigorous pre-market and post-market cybersecurity files.': '医療機器の接続性が高まるにつれ、サイバーセキュリティは重要な規制要件となっています。FDAのeSTARを用いた申請およびEU MDRへの対応では、製品に応じた市販前・市販後のサイバーセキュリティ文書を適切に整備することが求められます。',
  'Specialized Services for Global Manufacturers': 'グローバルメーカー向けの特化サービス',

  'Machinery Field Evaluation <span class="cert-name">(North America)</span>': '産業用機械 現場試験 <span class="cert-name">（北米）</span>',
  '"The express route to the North American market, delivering innovative time and cost savings."': '「時間とコストを革新的に削減する、北米市場へのエクスプレスルート」',
  'Custom-built machinery, low-volume production, or large-scale industrial equipment exported to North America often cannot undergo regular NRTL listing. Field Evaluation (per NFPA 790/791) provides a practical compliance route.': '北米へ輸出される特注機械、少量生産品、または大型産業用設備は、通常のNRTL登録（Listing）を受けるのが難しい場合が多いです。現場評価（NFPA 790/791に基づくField Evaluation）は、実用的な適合ルートを提供します。',

  'Explosion-Proof Quality Systems <span class="cert-name">(ISO/IEC 80079-34)</span>': '防爆品質マネジメントシステム <span class="cert-name">（ISO/IEC 80079-34）</span>',
  '"The heart of Ex certification: establishing flawless mass-production quality systems."': '「防爆認証の核心：欠陥のない量産品質体制の構築」',
  'Ex equipment manufacturers must not only certify their products (ATEX/IECEx) but also maintain a strictly controlled manufacturing quality system based on ISO/IEC 80079-34.': '防爆機器メーカーは、ATEXまたはIECExに基づく製品認証への対応に加え、ISO/IEC 80079-34に基づく製造品質マネジメントシステムを適切に維持する必要があります。',

  'Advanced Cybersecurity Regulations <span class="cert-name">(EU CRA & RED)</span>': '最新サイバーセキュリティ規制 <span class="cert-name">（EU CRA ＆ RED）</span>',
  '"Navigating rapidly changing digital regulations: turning business risks into opportunities."': '「急速に変化するデジタル規制の航海：ビジネスリスクを機会に」',
  'New cybersecurity laws like the EU Cyber Resilience Act (CRA) and updated RED (Radio Equipment Directive) impose strict software security requirements on almost all digital products.': 'EUサイバーレジリエンス法（CRA）や更新されたRED（無線機器指令）などの新しいサイバーセキュリティ法は、ほぼすべてのデジタル製品に対して厳格なソフトウェアセキュリティ要求事項を課しています。',

  // new keys from specialized-sectors-en.html
  'Security design reviews aligned with the General Safety and Performance Requirements (GSPR) of Annex I.': '欧州MDRの附属書Iに規定された一般安全及び性能要件（GSPR）に適合するセキュリティ設計の審査を実施します。',
  'Support for establishing vulnerability reporting structures and secure update distribution processes.': '脆弱性の報告体制および安全なアップデート配布プロセスの構築を支援します。',
  'Establishment of supply chain systems to maintain technical consistency of Ex-critical components.': '防爆安全上重要な重要部品（Ex-critical components）の技術的一貫性を維持するためのサプライチェーン管理体制を構築します。',
  'Establishment of software component management systems and comprehensive vulnerability analysis.': 'ソフトウェア構成部品の管理体制の構築および包括的な脆弱性分析を実施します。',
  'Proactive identification of non-conformities before field testing to ensure first-time approval.': '現場検査の前に不適合事項を事前に特定し、一度で承認が得られるようサポートします。',
  'Development of specialized quality manuals and procedure documents for Ex product manufacturing.': '防爆製品の製造に特化した品質マニュアルおよび規定類を開発します。',
  'Diagnostics of mandatory security requirements and conformity assessment support for CE marking.': 'CEマーキングにおける必須セキュリティ要求事項の自己適合評価および適合性評価の申請を支援します。',
  'Support for establishing security lifecycle processes for medical device software.': '医療機器ソフトウェアのセキュリティライフサイクルプロセスの構築を支援します。',
  'Electrical safety standard reviews for industrial machinery and control panels.': '産業用機械および制御盤の電気安全規格への適合性検証を行います。',
  'RED (Radio Equipment Directive) Security': 'RED（無線機器指令）セキュリティ',
  'Traceability & Supply Chain Management': 'トレーサビリティ＆サプライチェーン管理',
  'SBOM (Software Bill of Materials)': 'SBOM（ソフトウェア部品構成表）',
  'EU CRA (Cyber Resilience Act)': 'EU CRA（サイバーレジリエンス法）',
  'Medical Device Cybersecurity': '医療機器サイバーセキュリティ',
  'NFPA 79 & UL 508A Compliance': 'NFPA 79 ＆ UL 508A 適合',
  'Pre-audit Technical Services': '事前監査テクニカルサービス',
  'ISO/IEC 80079-34 Consulting': 'ISO/IEC 80079-34 コンサルティング',
  'As an alternative to full NRTL listing, Field Evaluation allows for the immediate inspection of product safety at the installation site for approval. This is the most efficient solution for large-scale equipment or specialized exports.': '通常のNRTL登録（Listing）に代わる費用対効果の高い方法であり、設置現場での迅速な安全検査により、通関や即時設置を容易にします。これは、大型設備や特注仕様の機器の輸出に最も効率的なソリューションです。',
  'Custom-built machinery, low-volume production, or large-scale industrial equipment exported to North America often cannot undergo regular NRTL listing. Field Evaluation (per NFPA 790/791) provides a practical compliance route.': '北米へ輸出される特注機械、少量生産品、または大型産業用設備は、通常のNRTL登録（Listing）を受けるのが難しい場合が多いです。現場評価（NFPA 790/791に基づくField Evaluation）は、実用的な適合ルートを提供します。',
  'Explosion-proof (ATEX/IECEx) certification requires not only safe product design but also a rigorous audit of the manufacturer\'s quality system (QAN/QAR). SGCA Partners is an industry leader in establishing Ex-specific quality systems.': '防爆（ATEX/IECEx）認証の取得には、安全な製品設計だけでなく、製造工場の品質体制（QAN/QAR）に対する厳格な審査も求められます。SGCA Partnersは、防爆特化型の品質システムの構築において業界をリードしています。',
  'Recently, both the US FDA and the European EU MDR have mandated rigorous cybersecurity requirements to ensure patient safety. SGCA Partners provides integrated security solutions that span from the initial design phase to post-market surveillance.': '近年、米国のFDAおよび欧州のEU MDRの双方において、患者の安全を確保するための厳格なサイバーセキュリティ要求事項が義務付けられています。SGCA Partnersは、初期の設計段階から市販後監視（PMS）に至るまで、統合的なセキュリティソリューションを提供します。',
  'The EU Cyber Resilience Act (CRA) and the security requirements of the Radio Equipment Directive (RED), mandatory from 2026, are essential for all digital products. We provide rapid interpretation and strategic roadmaps for these evolving regulations.': '2027年以降に本格適用されるEUサイバーレジリエンス法（CRA）および更新されたRED（無線機器指令）のセキュリティ要求事項は、ほぼすべてのデジタル製品において必須となります。当社は、これらの規制動向を迅速に解析し、戦略的なロードマップを提示します。',
  'Pre-audit rehearsals and gap closures for factory audits conducted by European and international Ex certification bodies.': '欧州のノーティファイドボディおよび国際防爆認証機関（ExCB）が実施する工場審査に向けて、事前模擬審査（リハーサル）およびギャップ分析を通じた改善活動を支援します。',
  'Expert preparation of cybersecurity-related technical documentation (PMA/510k) and security risk management.': 'サイバーセキュリティ関連の技術文書（PMA/510k）の作成およびセキュリティリスクマネジメントについて、専門的な申請書類作成の支援を行います。',
  'Compliance strategies for network protection and privacy requirements for wireless communication devices.': '無線通信機能を持つ製品について、ネットワーク保護やプライバシー要求事項への適合戦略を提示します。',
  'On-site evaluations to ensure compliance with the safety standards required by local Authorities Having Jurisdiction (AHJ) across North America.': '北米全域の管轄当局（AHJ）が要求する安全基準への適合を検証するため、設置現場での評価（Field Evaluation）を支援します。',

  // insights-en.html specific
  'Explore the latest regulatory trends and expert analysis reports across key global industries.': '世界の主要産業における最新の規制動向と専門家による分析レポートをご覧いただけます。',
  'Search keywords (e.g., FDA, ISO)': '検索キーワード (例: FDA, ISO)',
  'Register New Report (Admin)': '新規レポート登録 (管理者)',
  'Draft Reports': '下書きレポート',
  'Not yet published. Review and publish when ready.': 'まだ公開されていません。準備ができたら確認して公開してください。',
  'Published Reports': '公開済みレポート',
  'No draft reports.': '下書きレポートはありません。',
  'No published reports.': '公開済みレポートはありません。',
  'View Source ↗': '原文リンク ↗',
  'Summary': '要約',
  'Full Content': '詳細内容',
  'View Original Source': '原文を確認',
  'Close': '閉じる',

  'Please enter Firebase configuration in js/firebase-init.js.': 'js/firebase-init.jsにFirebase設定を入力してください。',
  'Error loading reports. Please check console.': 'レポートの読み込み中にエラーが発生しました。コンソールを確認してください。',
  'Failed to load data. Check console.': 'データの読み込みに失敗しました。コンソールを確認してください。',
  'Loading published reports...': '公開済みレポートを読み込んでいます...',

  'No reports available at the moment. (Server returned 0 reports)': '現在、登録されているレポートはありません。（サーバーから返されたレポート数：0）',
  'No reports available at the moment. (All reports are in draft state)': '現在、公開されているレポートはありません。（すべてのレポートが下書き状態です）'
};

const cnTranslations = {
  // Common Nav & Header
  'About Us': '公司介绍',
  'Management Systems': '管理体系认证',
  'ISO 9001 (Quality)': 'ISO 9001 (质量)',
  'ISO 14001 (Environment)': 'ISO 14001 (环境)',
  'ISO 45001 (Health & Safety)': 'ISO 45001 (职业健康安全)',
  'ISO 13485 (Medical Devices)': 'ISO 13485 (医疗器械)',
  'ISO 19443 (Nuclear)': 'ISO 19443 (核电)',
  'Product Certification': '产品认证',
  'NRTL (North America)': '美国NRTL及加拿大产品安全认证',
  'CE Marking (Europe)': 'CE 标志（欧盟产品合格标志）',
  'KC Certification (Korea)': 'KC认证 (韩国)',
  'Specialized Sectors': '专业领域',
  'Medical Cybersecurity': '医疗器械网络安全',
  'Field Evaluation': '工业机械现场测试',
  'Ex Quality Systems': '防爆质量管理体系',
  'Cybersecurity Regulations': '最新网络安全法规',
  'Insights': '行业洞察',

  // Common Footer
  'Representative Phone': '代表电话',
  'Email': '电子邮箱',
  'Business Registration No.': '营业执照注册号',
  'Managing Partner: Sangwoo Sim': '代表合伙人：Sangwoo Sim',
  'Business Registration: 456-37-01417': '营业执照注册号：456-37-01417',
  'Business Reg No: 456-37-01417': '营业执照注册号：456-37-01417',
  'Managing Partner: Sang-woo Sim': '代表合伙人：Sang-woo Sim',

  // index-en.html specific
  'Navigating Regulatory<br>Barriers for Innovation': '突破医疗器械创新<br>的法规壁垒',
  'From FDA and EU MDR compliance to pre/post-market cybersecurity, we ensure the safest path for your healthcare innovations.': '从 FDA 和 EU MDR 合规到上市前/后的网络安全，我们为更安全的医疗健康创新提供支持。',
  'Accelerating Global<br>Market Access': '加速进入全球<br>工业机械市场',
  'Realize seamless entry into international markets through expert North American Field Evaluation and CE/UKCA machinery compliance.': '通过北美现场评估以及欧盟和英国机械法规与CE/UKCA合规支持，协助企业高效、顺利地进入海外市场。',
  'Uncompromising Safety for<br>Extreme Environments': '极端环境下的<br>严格安全标准',
  'Prove excellence with ATEX, IECEx, and NRTL-Ex conformity assessments backed by ISO/IEC 80079-34 quality system audits.': '通过 ATEX、IECEx、NRTL-Ex 符合性评估以及基于 ISO/IEC 80079-34 的质量管理体系审核，证明高水平的防爆安全合规能力。',
  'Ensuring Nuclear Safety &<br>Supply Chain Integrity': '保障核安全与<br>核电供应链完整性',
  'Build trust in critical national infrastructure through ISO 19443 quality management and rigorous cybersecurity frameworks.': '通过基于 ISO 19443 的核电质量管理和严密的网络安全体系，提升国家基建产业的信任度。',
  'Specialized Industry Sectors': '特色产业领域',
  'Ensuring absolute regulatory compliance in the most demanding environments.': '即使在最严苛的环境下，我们也能实现高水平的法规合规。',
  'Medical Devices': '医疗器械',
  'Nuclear Safety': '核电安全',
  'Industrial Machinery': '工业机械',
  'FDA and EU MDR compliance, pre/post-market cybersecurity, and IEC 62304 standard consulting.': 'FDA和EU MDR合规、上市前及上市后网络安全，以及IEC 62304医疗器械软件生命周期过程合规支持。',
  'ISO 19443 nuclear quality management systems encompassing supply chain integrity.': '覆盖核电供应链完整性的 ISO 19443 核电质量管理体系。',
  'North American Field Evaluation, CE/UKCA machinery regulations, and cybersecurity requirements.': '北美现场评估、欧盟及英国机械法规与CE/UKCA合规、网络安全要求。',
  'Latest Regulatory Updates': '最新法规动态',
  'Stay informed with the latest regulatory trends and expert analysis reports across key global industries.': '了解全球核心行业的最新监管动态和专家分析报告。',
  'View All Insights': '查看全部行业洞察',

  // company-intro-en.html specific
  'About Us | SGCA Partners': '公司介绍 | SGCA Partners',
  'A core essence that underpins the safety of high-risk industries,<br><span>SGCA Partners is a \'Risk Management\' specialist firm based on global standards.</span>': '贯穿高危行业安全的核心本质，<br><span>SGCA Partners 是基于全球标准的“风险管理 (Risk Management)”专业咨询公司。</span>',
  'SGCA Partners (Smart Global Conformity Assessment Partners) is a professional conformity assessment consulting firm specializing in system and product certification, and global cybersecurity regulations for high-risk sectors requiring strict safety and reliability, such as medical devices, industrial machinery, and nuclear energy. Based on our deep insight into \'Risk Management\', the core of all high-risk industries, we prove the safety and trust of our clients.': 'SGCA Partners（Smart Global Conformity Assessment Partners）是一家专业的合格评定与法规咨询机构，专注于医疗器械、工业机械及核能等对安全性和可靠性要求较高的行业。我们提供管理体系认证准备、产品认证与合格评定支持，以及全球网络安全法规咨询服务。基于对高风险行业核心原则——风险管理的深刻理解，SGCA Partners致力于帮助客户提升其产品与体系的安全性和可靠性。',
  'Expertise & Services': '专业知识与服务',
  'We provide optimal compliance solutions based on deep expertise and rich experience.': '我们凭借专业知识和丰富经验，提供适合客户需求的合规解决方案。',
  'Core Competency: Integrated Risk Management Solution': '核心竞争力：集成风险管理 (Risk Management) 解决方案',
  'Medical devices (ISO 14971), industrial machinery (ISO 12100), and nuclear systems share one essence: \'Risk-Based Thinking\', although their regulatory mechanisms differ. SGCA Partners provides a differentiated risk management methodology that identifies, evaluates, and controls potential risk factors throughout the entire process from product design to the supply chain.': '尽管医疗器械（ISO 14971）、工业机械（ISO 12100）和核能系统适用不同的法规机制，但均以“基于风险的思维”（Risk-Based Thinking）为共同的核心原则。SGCA Partners采用自主构建的风险管理方法，在产品设计及供应链全过程中识别、评估并控制潜在风险。',
  'High-Risk Industry Expertise': '高危行业专业特长',
  'EU MDR/IVDR, US FDA regulatory compliance, product risk management based on ISO 14971, and preemptive cybersecurity framework construction for connected medical devices.': '欧盟 MDR/IVDR 及美国 FDA 法规合规、基于 ISO 14971 的产品风险管理，以及针对互联医疗器械的前瞻性网络安全框架构建。',
  'Machine and explosion-proof product certification complying with global safety standards (CE, NRTL, etc.), Risk Assessment, and industrial control system cybersecurity response for smart manufacturing environments.': '符合全球安全标准（CE、NRTL 等）的机械和防爆产品认证、风险评估 (Risk Assessment)，以及智能制造环境下的工业控制系统网络安全响应。',
  'Support for nuclear supply chain and system regulations requiring the highest level of safety and quality assurance.': '为需要最高水平安全性和质量保证的核电供应链及体系法规提供合规支持。',
  'Comprehensive Compliance': '全方位合规',
  'We provide an optimal integrated strategy that penetrates the entire process from system certification (ISO 9001, 14001, 45001, 13485, ISO 19443, etc.) proving organizational reliability, to product certification and cybersecurity response for overcoming global market barriers.': '我们提供全方位合规策略，从证明组织可靠性的管理体系认证（ISO 9001, 14001, 45001, 13485, ISO 19443 等），到克服全球市场壁垒的产品认证和网络安全响应。',
  'Smart & Global Compliance': '智能与全球合规',
  'Based on over 25 years of rich practical experience and a global network, we simplify complex technical regulations and demanding risk management processes to help clients settle in the global market as quickly and safely as possible.': '凭借25年以上的丰富实操经验和全球化网络，我们将复杂的出海技术法规和严苛的风险管理流程进行简化，协助客户以最快、最安全的方式开拓全球市场。',
  '"In the midst of rapidly changing technical standards and cyber threats, regulatory response is not a barrier, but the ultimate competitive advantage to lead the global market. SGCA Partners will be a reliable partner so that clients\' businesses can grow sustainably on global safety and security standards."': '“在技术标准和网络威胁瞬息万变的时代，法规合规并非壁垒，而是引领全球市场的核心竞争优势。SGCA Partners 将成为您值得信赖的伙伴，助力客户的业务在符合全球安全与网络安全标准的前提下实现可持续增长。”',
  'SGCA Partners Team': 'SGCA Partners 团队',

  // management-system-en.html specific
  'Management System Certification | SGCA Partners': '管理体系认证 | SGCA Partners',
  'Management System Certification': '管理体系认证',
  'In-depth expertise in foundational and specialized international standards.': '在基础和特色国际标准领域拥有深厚的专业积淀。',
  'ISO 9001 <span class="cert-name">(Quality Management)</span>': 'ISO 9001 <span class="cert-name">(质量管理)</span>',
  '"The essential benchmark for quality demanded by the global market."': '“全球市场所要求的质量基本基准。”',
  'ISO 9001 is the international standard for quality management systems applicable to any industry. Beyond mere product quality, it certifies that an organization has established systematic processes to consistently meet customer requirements and drive continuous improvement.': 'ISO 9001 是质量管理体系 (QMS) 的国际标准。它为企业提供了一个框架，用以证明其有能力稳定地提供满足客户和法规要求的产品与服务。',
  'Scope': '适用范围',
  'All industries (manufacturing, services, public sectors, etc.)': '所有行业（制造、服务、公共部门等）',
  'Core Services': '核心服务',
  'QMS gap analysis, process design and documentation support, internal auditor training, and certification audit readiness.': 'QMS 差距分析、流程设计与建档支持、内审员培训以及认证审核准备。',

  'ISO 14001 <span class="cert-name">(Environmental Management)</span>': 'ISO 14001 <span class="cert-name">(环境管理)</span>',
  '"A strategic necessity for sustainable growth and the cornerstone of ESG management."': '“可持续增长的战略选择，也是 ESG 管理的基石。”',
  'This standard defines the management framework required to minimize the environmental impact of an organization\'s activities, products, and services. It is a management strategy that encompasses resource efficiency and regulatory compliance beyond basic environmental protection.': '该标准定义了减少企业活动、产品和服务对环境造成负面影响的管理框架。这是一种超越基本环境保护的经营战略，涵盖了资源利用效率和法规合规。',
  'EMS gap analysis, environmental aspect evaluation, legal compliance checks, and EMS system construction.': 'EMS 差距分析、环境因素评估、法律法规符合性检查以及 EMS 体系构建。',

  'ISO 45001 <span class="cert-name">(Occupational Health & Safety)</span>': 'ISO 45001 <span class="cert-name">(职业健康安全管理)</span>',
  '"The safety of your workforce is your company\'s greatest asset."': '“员工的生命健康安全是企业最大的资产。”',
  'The international standard for preventing occupational injuries by identifying and managing workplace hazards. Its purpose is to create a safe work environment by continuously improving an organization\'s health and safety performance.': '通过识别和管理工作场所的危险源来预防工伤事故的国际标准。旨在通过持续改善企业的健康和安全绩效，打造安全的工作环境。',
  'OH&S hazard identification and risk assessment, safety manual and procedure design, and compliance auditing.': '职业健康安全危险源识别与风险评估、安全手册及程序设计以及合规审计。',

  'ISO 13485 <span class="cert-name">(Medical Device Quality)</span>': 'ISO 13485 <span class="cert-name">(医疗器械质量管理)</span>',
  '"The mandatory gateway for entering the global medical device market."': '“进入全球医疗器械市场的强制性门槛。”',
  'A quality management standard specifically tailored for the medical device industry. It evaluates the ability to ensure safety and effectiveness throughout the entire product lifecycle, from design and development to production, installation, and associated services.': '专门针对医疗器械行业定制的质量管理标准。旨在评估企业在产品设计开发、生产、安装及相关服务全生命周期中保障安全和有效性的能力。',
  'Medical QMS design, software validation support, technical file alignment, and MDR/IVDR integrated consulting.': '医疗器械 QMS 设计、软件验证支持、技术文档整合以及 MDR/IVDR 综合咨询。',

  'ISO 19443 <span class="cert-name">(Nuclear Industry Quality)</span>': 'ISO 19443 <span class="cert-name">(核能行业质量管理)</span>',
  '"Committed to the world\'s highest standards of nuclear safety and quality."': '“致力于全球最高标准的核安全与质量。”',
  'Based on ISO 9001, this standard adds specific nuclear industry requirements to strengthen safety and quality throughout the supply chain. It focuses on IT security, supply chain management, and the cultivation of a safety culture.': '在 ISO 9001 的基础上，增加了核电行业特有要求，用以加强整个供应链的安全与质量。侧重于 IT 安全、供应链管理及安全文化的培养。',
  'Nuclear safety culture evaluation, supply chain audit readiness, nuclear QMS manual development, and implementation consulting.': '核安全文化评估、供应链审核准备、核电质量管理体系手册开发及实施咨询。',

  // management-system-en.html specific list items (CN)
  'Prove high reliability, including the prevention of counterfeit or fraudulent items (CFSI) and IT security for critical components.': '证实高可靠性，包括防范伪造/欺诈性部件 (CFSI) 以及关键部件的 IT 安全。',
  'Manage risks associated with increasingly complex global environmental laws and Carbon Border Adjustment Mechanisms (CBAM).': '管控与日益复杂的全球环境法规和碳边境调节机制 (CBAM) 相关的风险。',
  'Demonstrate compliance with strengthened safety and health regulations, such as the Serious Accidents Punishment Act.': '证明符合如《重大灾害处罚法》等不断收紧的安全卫生法律法规。',
  'Successfully embed the \'Safety First\' principle, unique to the nuclear industry, across the entire organization.': '成功将核电行业特有的“安全第一”原则融入到整个组织中。',
  'Enhance brand value by demonstrating quality management capabilities that align with international standards.': '展现符合国际标准的质量管理能力，提升品牌价值。',
  'Meet the international quality certification requirements essential for exporting nuclear power technology.': '满足出口核电技术所必需的国际质量认证要求。',
  'Achieve tangible reductions in operating costs through waste minimization and improved energy efficiency.': '通过废弃物减量化和提高能源利用效率，切实降低运营成本。',
  'Meet mandatory requirements and secure advantage points in public and private procurement processes.': '满足强制性要求，并在公共和私人采购流程中获得优势加分。',
  'Secure external credibility by meeting demands for carbon neutrality and ESG information disclosure.': '通过应对碳中和及 ESG 信息披露要求，获取外部公信力。',
  'Prevent human and material losses and maintain productivity through systematic risk assessments.': '通过系统性的风险评估，防范人身及财产损失，维持生产力。',
  'Attract top talent and improve labor relations by fostering a culture that prioritizes safety.': '通过倡导安全第一的文化，吸引优秀人才并改善劳资关系。',
  'Meet the minimum qualification requirements demanded by international buyers and distributors.': '满足国际买家和分销商要求的最低资格准入条件。',
  'Reduce product recall risks through rigorous risk management and validation processes.': '通过严密的风险管理和验证过程，降低产品召回风险。',
  'Reduce costs by eliminating redundant tasks and optimizing core business processes.': '消除冗余任务，优化核心业务流程，从而降低运营成本。',
  'Establish a core foundation for compliance with EU MDR/IVDR and US FDA regulations.': '为符合欧盟 MDR/IVDR 和美国 FDA 法规奠定核心基础。',

  'Global Nuclear Market Leadership': '引领全球核电市场',
  'Resource & Energy Optimization': '资源和能源优化',
  'Guaranteed Quality Consistency': '保证质量一致性',
  'Proactive Regulatory Response': '主动应对法规',
  'Global Regulatory Compliance': '符合全球监管要求',
  'Global Partnership Expansion': '拓展全球合作',
  'Competitive Edge in Tenders': '竞标中的竞争优势',
  'Safety Culture Integration': '融合安全文化',
  'Building Customer Trust': '树立客户信任',
  'Operational Efficiency': '提高运营效率',
  'Legal Risk Mitigation': '降低法律风险',
  'Reduced Accident Rates': '降低事故发生率',
  'Trusted Corporate Culture': '值得信赖的企业文化',
  'Supply Chain Integrity': '供应链完整性',

  // product-certification-en.html specific
  'Product Certification | SGCA Partners': '产品认证 | SGCA Partners',
  'Facilitating global market entry for industrial and high-tech equipment.': '助力工业及先进设备顺利开拓全球市场。',
  'NRTL <span class="cert-name">(North American Product Safety)</span>': 'NRTL <span class="cert-name">(北美产品安全)</span>',
  '"The definitive safety assurance for entering US and Canadian markets."': '“进入美国和加拿大市场的确定性安全保障。”',
  'NRTL (Nationally Recognized Testing Laboratory) is a system where product safety is certified by labs recognized by the US Occupational Safety and Health Administration (OSHA). It is essential for electrical/electronic products and industrial machinery exported to the US and Canada.': 'NRTL（Nationally Recognized Testing Laboratory）是经美国职业安全与健康管理局（OSHA）认可的第三方测试与认证机构体系，主要用于证明在美国工作场所使用的相关产品符合适用的安全标准。对于加拿大市场，还需根据加拿大法规及SCC认可体系确认适用的认证要求。',
  'Specialized Services from SGCA Partners': 'SGCA Partners 的专享服务',
  'Design Review': '设计审查',
  'AHJ Approval Support': 'AHJ 审批支持',
  'Regulatory Transition Support': '法规过渡期支持',
  'Declaration of Conformity (DoC) Guidance': '符合性声明 (DoC) 指导',
  'Pre-audit Technical Services': '审核前技术服务',
  'Post-Certification Maintenance': '认证后维护',
  'Regulatory Hub for Inbound Market': '内销市场法规中心',
  'Industrial control panels, IT equipment, medical devices, laboratory equipment, and explosion-proof (Ex) devices.': '工业控制柜、IT设备、医疗器械、实验室设备、防爆设备等。',

  'CE Marking <span class="cert-name">(European Union Compliance)</span>': 'CE 标志 <span class="cert-name">(欧盟符合性)</span>',
  '"Your trade passport to the markets of 30 European nations."': '“进入欧洲30国市场的贸易通行证。”',
  'The CE marking signifies that products circulated within the European Economic Area (EEA) comply with all applicable EU directives and regulations related to safety, health, and environmental protection. It is a mandatory requirement for European market access.': 'CE标志表明产品符合适用的欧盟协调法规中有关安全、健康及环境保护等方面的要求。制造商必须根据适用法规完成相应的符合性评估，并在要求适用时加贴CE标志。',
  'Machinery (MD/MR), Low Voltage (LVD), Electromagnetic Compatibility (EMC), Medical Devices (MDR), and Cybersecurity (CRA/RED).': '机械(MD/MR)、低电压(LVD)、电磁兼容(EMC)、医疗器械(MDR)、网络安全(CRA/RED)。',

  'KC Certification <span class="cert-name">(Korea Certification)</span>': 'KC 认证 <span class="cert-name">(韩国国家统一认证)</span>',
  '"Smart regulatory guidance for entering the Korean market."': '“进入韩国市场的智能合规指南。”',
  'KC Certification is the integrated national certification system for safety, health, environment, and quality of products distributed in South Korea. Compliance is mandatory under laws such as the Electrical Appliances and Consumer Products Safety Control Act and the Radio Waves Act.': 'KC认证是由国家对在大韩民国国内流通的产品的安全、卫生、环境、质量等进行认证的制度。根据《电气用品及生活用品安全管理法》、《电波法》等评估其符合性。',
  'Electrical appliances, consumer goods, children\'s products, and broadcasting/communication equipment (wireless devices, etc.).': '电气用品、生活用品、儿童用品、广播通信设备（无线设备等）。',

  // product-certification-en.html descriptions (CN)
  'A cost-effective alternative to full NRTL listing, providing rapid on-site safety inspections to facilitate customs clearance and immediate installation.': '现场评估作为常规 NRTL 列名认证的替代方案，允许在安装现场直接进行产品安全检测并获得批准。这是针对大型设备或特殊出口产品最高效的解决方案。',
  'Expert Technical Construction File (TCF) preparation for the upcoming Machinery Regulation and Cyber Resilience Act (CRA) mandatory from 2026.': '针对2027年起分阶段全面适用的欧盟《机械法规》（EU）2023/1230及《网络韧性法案》（EU）2024/2847，协助准备相应的技术文档。',
  'Proactive identification of non-conformities with North American standards (UL, CSA, NFPA) and provision of expert modification guidelines.': '提前识别不符合北美标准（UL、CSA、NFPA）的设计并提供整改指南。',
  'Real-time resolution of language barriers and regulatory misinterpretations for international manufacturers exporting to South Korea.': '实时协助境外制造商解决向韩国出口时面临的语言障碍及法规解读偏差。',
  'Support for periodic audits and expert guidance on labeling modifications required by ongoing legislative updates.': '提供获得认证后的定期审核辅导以及因法规修订而需进行的标识 (Labeling) 修改指南。',
  'Specialized guidance on complex testing procedures and the authoring of comprehensive Risk Assessment reports.': '就复杂的测试程序及详尽的风险评估 (Risk Assessment) 报告撰写提供专业指导。',

  // specialized-sectors-en.html specific
  'Specialized Sectors | SGCA Partners': '专业领域 | SGCA Partners',
  'Advanced regulatory compliance solutions for extreme environments and cybersecurity.': '针对极端环境和网络安全的高水平合规解决方案。',
  'Medical Device Cybersecurity <span class="cert-name">(FDA & EU MDR)</span>': '医疗器械网络安全 <span class="cert-name">(FDA & EU MDR)</span>',
  '"Robust security guidance for the digital healthcare era as demanded by global markets."': '“全球市场所要求的数字化医疗时代安全防护指南。”',
  'As medical devices become more connected, cybersecurity has become a critical regulatory requirement. FDA (eStar) and EU MDR demand rigorous pre-market and post-market cybersecurity files.': '随着医疗器械联网化的深入，网络安全已成为关键的监管要求。FDA的eSTAR提交要求及欧盟MDR框架均要求制造商充分准备与产品相关的上市前和上市后网络安全资料。',
  'Specialized Services for Global Manufacturers': '面向全球制造商的专享服务',

  'Machinery Field Evaluation <span class="cert-name">(North America)</span>': '工业机械现场评估 <span class="cert-name">(北美)</span>',
  '"The express route to the North American market, delivering innovative time and cost savings."': '“极速通往北美市场的绿色通道，创新性地节省时间和成本。”',
  'Custom-built machinery, low-volume production, or large-scale industrial equipment exported to North America often cannot undergo regular NRTL listing. Field Evaluation (per NFPA 790/791) provides a practical compliance route.': '出口到北美的定制机械、小批量产品或大型工业设备通常难以获得常规的 NRTL 列名认证。现场评估（根据 NFPA 790/791 进行的 Field Evaluation）提供了一条务实的合规路径。',

  'Explosion-Proof Quality Systems <span class="cert-name">(ISO/IEC 80079-34)</span>': '防爆质量管理体系 <span class="cert-name">(ISO/IEC 80079-34)</span>',
  '"The heart of Ex certification: establishing flawless mass-production quality systems."': '“防爆认证的核心：建立完美的量产质量体系。”',
  'Ex equipment manufacturers must not only certify their products (ATEX/IECEx) but also maintain a strictly controlled manufacturing quality system based on ISO/IEC 80079-34.': '防爆设备制造商不仅要通过其产品认证（ATEX/IECEx），还必须维护基于 ISO/IEC 80079-34 的严格受控的制造质量体系。',

  'Advanced Cybersecurity Regulations <span class="cert-name">(EU CRA & RED)</span>': '最新网络安全法规 <span class="cert-name">(EU CRA & RED)</span>',
  '"Navigating rapidly changing digital regulations: turning business risks into opportunities."': '“应对瞬息万变的数字化法规：将业务风险转化为机遇。”',
  'New cybersecurity laws like the EU Cyber Resilience Act (CRA) and updated RED (Radio Equipment Directive) impose strict software security requirements on almost all digital products.': '欧盟《网络韧性法案》(CRA) 和更新的 RED（无线电设备指令）等全新网络安全法律，对几乎所有数字化产品都提出了严苛的软件安全要求。',

  // new keys from specialized-sectors-en.html
  'Security design reviews aligned with the General Safety and Performance Requirements (GSPR) of Annex I.': '依据 Annex I 的通用安全和性能要求 (GSPR) 进行安全设计评估。',
  'Support for establishing vulnerability reporting structures and secure update distribution processes.': '支持建立漏洞报告机制和安全更新分发流程。',
  'Establishment of supply chain systems to maintain technical consistency of Ex-critical components.': '建立供应链体系以维持防爆关键元器件的技术一致性。',
  'Establishment of software component management systems and comprehensive vulnerability analysis.': '建立软件组件管理体系和全面的漏洞分析。',
  'Proactive identification of non-conformities before field testing to ensure first-time approval.': '在现场测试前主动识别不符合项，以确保首次顺利通过。',
  'Development of specialized quality manuals and procedure documents for Ex product manufacturing.': '开发用于防爆产品制造的专业质量手册和程序文件。',
  'Diagnostics of mandatory security requirements and conformity assessment support for CE marking.': '进行 CE 标志强制性安全要求诊断并提供符合性评估支持。',
  'Support for establishing security lifecycle processes for medical device software.': '支持建立医疗器械软件的安全生命周期流程。',
  'Electrical safety standard reviews for industrial machinery and control panels.': '针对工业机械和控制柜进行电气安全标准评估。',
  'RED (Radio Equipment Directive) Security': 'RED (无线电设备指令) 安全',
  'Traceability & Supply Chain Management': '追溯性与供应链管理',
  'SBOM (Software Bill of Materials)': '软件物料清单 (SBOM)',
  'EU CRA (Cyber Resilience Act)': '欧盟 CRA (网络韧性法案)',
  'Medical Device Cybersecurity': '医疗器械网络安全',
  'NFPA 79 & UL 508A Compliance': 'NFPA 79 & UL 508A 合规',
  'Pre-audit Technical Services': '审核前技术服务',
  'ISO/IEC 80079-34 Consulting': 'ISO/IEC 80079-34 咨询',
  'As an alternative to full NRTL listing, Field Evaluation allows for the immediate inspection of product safety at the installation site for approval. This is the most efficient solution for large-scale equipment or specialized exports.': '现场评估作为常规 NRTL 列名认证的替代方案，允许在安装现场直接进行产品安全检测并获得批准。这是针对大型设备或特殊出口产品最高效的解决方案。',
  'Custom-built machinery, low-volume production, or large-scale industrial equipment exported to North America often cannot undergo regular NRTL listing. Field Evaluation (per NFPA 790/791) provides a practical compliance route.': '出口到北美的定制机械、小批量产品或大型工业设备通常难以获得常规的 NRTL 列名认证。现场评估（根据 NFPA 790/791 进行的 Field Evaluation）提供了一条务实的合规路径。',
  'Explosion-proof (ATEX/IECEx) certification requires not only safe product design but also a rigorous audit of the manufacturer\'s quality system (QAN/QAR). SGCA Partners is an industry leader in establishing Ex-specific quality systems.': '防爆（ATEX/IECEx）认证不仅要求安全的产品设计，还要求对制造商的质量体系（QAN/QAR）进行严格审核。SGCA Partners 是建立防爆专用质量体系的行业领跑者。',
  'Recently, both the US FDA and the European EU MDR have mandated rigorous cybersecurity requirements to ensure patient safety. SGCA Partners provides integrated security solutions that span from the initial design phase to post-market surveillance.': '近期，美国 FDA 和欧洲 EU MDR 都强制实施了严格的网络安全要求以保障患者安全。SGCA Partners 提供从初始设计阶段到上市后监管的全流程整合安全解决方案。',
  'The EU Cyber Resilience Act (CRA) and the security requirements of the Radio Equipment Directive (RED), mandatory from 2026, are essential for all digital products. We provide rapid interpretation and strategic roadmaps for these evolving regulations.': '欧盟《网络韧性法案》(CRA) 和《无线电设备指令》(RED) 的网络安全要求（将于2027年起分阶段全面适用）对于几乎所有数字化产品都至关重要。我们为这些不断变化的法规提供快速的解读和战略路线图。',
  'Pre-audit rehearsals and gap closures for factory audits conducted by European and international Ex certification bodies.': '针对欧洲和国际防爆认证机构实施的工厂审核，开展预审核模拟演练和差距消除工作。',
  'Expert preparation of cybersecurity-related technical documentation (PMA/510k) and security risk management.': '专业准备网络安全相关技术文档 (PMA/510k) 以及安全风险管理。',
  'Compliance strategies for network protection and privacy requirements for wireless communication devices.': '针对无线通信设备的网络保护和隐私要求的合规战略。',
  'On-site evaluations to ensure compliance with the safety standards required by local Authorities Having Jurisdiction (AHJ) across North America.': '开展现场评估，以确保符合北美各地地方主管当局 (AHJ) 要求的安全标准。',

  // insights-en.html specific
  'Explore the latest regulatory trends and expert analysis reports across key global industries.': '了解全球核心行业的最新监管动态和专家分析报告。',
  'Search keywords (e.g., FDA, ISO)': '搜索关键词 (例如: FDA, ISO)',
  'Register New Report (Admin)': '注册新报告 (管理员)',
  'Draft Reports': '草稿报告',
  'Not yet published. Review and publish when ready.': '尚未发布。准备就绪后进行审核并发布。',
  'Published Reports': '已发布报告',
  'No draft reports.': '没有草稿报告。',
  'No published reports.': '没有已发布报告。',
  'View Source ↗': '查看原文 ↗',
  'Summary': '摘要',
  'Full Content': '详细内容',
  'View Original Source': '查看原文链接',
  'Close': '关闭',

  'Please enter Firebase configuration in js/firebase-init.js.': '请在 js/firebase-init.js 中输入 Firebase 配置。',
  'Error loading reports. Please check console.': '加载报告时出错。请检查控制台。',
  'Failed to load data. Check console.': '加载数据失败。请检查控制台。',
  'Loading published reports...': '正在加载已发布报告...',

  'No reports available at the moment. (Server returned 0 reports)': '当前没有可用的报告。（服务器返回了0篇报告）',
  'No reports available at the moment. (All reports are in draft state)': '当前没有可用的报告。（所有报告均处于草稿状态）'
};

// Sort function helper to avoid sub-phrase match corruption (longest match first)
function getSortedKeys(dict) {
  return Object.keys(dict).sort((a, b) => b.length - a.length);
}

const workspaceDir = path.resolve(__dirname, '..');

const pages = [
  'index',
  'company-intro',
  'management-system',
  'product-certification',
  'specialized-sectors',
  'insights'
];

// Helper to do translation replacements
function translateFile(filename, dictionary) {
  const filePath = path.join(workspaceDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const sortedKeys = getSortedKeys(dictionary);

  sortedKeys.forEach(key => {
    // Escape regex characters
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    content = content.replace(regex, dictionary[key]);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Translated: ${filename}`);
}

pages.forEach(p => {
  translateFile(`${p}-jp.html`, jpTranslations);
  translateFile(`${p}-cn.html`, cnTranslations);
});

// Export translations for validation
function exportTranslations(filename, title, dict) {
  const mdPath = path.join(workspaceDir, filename);
  let mdContent = `# SGCA Partners - ${title} Translation Verification List\n\n`;
  mdContent += `This file contains the full map of English source texts to their Japanese/Chinese translations for easy verification in external translation tools.\n\n`;
  
  // 1. JSON block
  mdContent += `## JSON Dictionary\n\n\`\`\`json\n${JSON.stringify(dict, null, 2)}\n\`\`\`\n\n`;
  
  // 2. Markdown Table
  mdContent += `## Translation Table\n\n| English (Source) | Translated (${title}) |\n| --- | --- |\n`;
  Object.keys(dict).forEach(key => {
    // Replace newlines with <br> for markdown tables
    const escapedKey = key.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|');
    const escapedVal = dict[key].replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|');
    mdContent += `| ${escapedKey} | ${escapedVal} |\n`;
  });

  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log(`Exported verification file: ${filename}`);
}

exportTranslations('translations-jp.md', 'Japanese', jpTranslations);
exportTranslations('translations-cn.md', 'Chinese', cnTranslations);
