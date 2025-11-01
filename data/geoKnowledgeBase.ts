export interface KnowledgeTerm {
    id: string;
    term: string;
    definition: string;
    detailedExplanation: string;
    category: string;
    relatedTerms: string[];
    examples?: string[];
    technicalDetails?: string;
    bestPractices?: string[];
    commonMistakes?: string[];
}

export interface Category {
    id: string;
    name: string;
    description: string;
    icon: string;
}

export const categories: Category[] = [
    {
        id: "core-concepts",
        name: "Core Concepts",
        description: "Fundamental principles of Generative Engine Optimization",
        icon: "brain"
    },
    {
        id: "technical",
        name: "Technical Implementation",
        description: "Technical frameworks and implementation strategies",
        icon: "code"
    },
    {
        id: "ai-systems",
        name: "AI Systems",
        description: "Understanding AI architectures and platforms",
        icon: "robot"
    },
    {
        id: "data-structures",
        name: "Data Structures",
        description: "Semantic data formats and knowledge representation",
        icon: "database"
    },
    {
        id: "metrics",
        name: "Metrics & Analytics",
        description: "Measuring GEO performance and impact",
        icon: "chart"
    },
    {
        id: "strategy",
        name: "Strategy",
        description: "Strategic approaches to GEO implementation",
        icon: "target"
    }
];

export const knowledgeTerms: KnowledgeTerm[] = [
    {
        id: "geo",
        term: "Generative Engine Optimization",
        definition: "The strategic discipline of optimizing digital content and brand presence to be selected, cited, and synthesized by AI language models in their generated responses.",
        detailedExplanation: "Generative Engine Optimization represents a fundamental shift in how brands establish digital authority. Unlike traditional SEO which optimizes for search engine rankings, GEO focuses on becoming an authoritative source that AI systems reference when answering user queries. This involves structuring content in semantically rich formats, establishing clear entity relationships, and ensuring information authenticity. The practice emerged as large language models began serving as primary information retrieval systems, fundamentally changing how knowledge is discovered and consumed.",
        category: "core-concepts",
        relatedTerms: ["rag", "semantic-seo", "knowledge-graph", "ai-citations"],
        examples: [
            "Optimizing technical documentation so Claude cites your framework in development answers",
            "Structuring product information for Perplexity to recommend in purchase decisions",
            "Creating industry reports that ChatGPT references as authoritative sources"
        ],
        bestPractices: [
            "Focus on factual accuracy and verifiable information",
            "Structure content with clear entity relationships",
            "Implement comprehensive Schema.org markup",
            "Maintain consistent brand identity across all digital touchpoints",
            "Create content that answers questions at multiple depth levels"
        ],
        commonMistakes: [
            "Treating GEO as keyword optimization rather than authority building",
            "Neglecting structured data implementation",
            "Creating shallow content without substantive value",
            "Failing to establish clear authorship and credentials"
        ]
    },
    {
        id: "nicosia-method",
        term: "The Nicosia Method",
        definition: "A proprietary framework that structures brand expertise into machine-readable, semantically rich formats for AI systems.",
        detailedExplanation: "The Nicosia Method is a systematic approach to encoding brand authority directly into AI systems' foundational logic. Named after the ancient principle of establishing truth in digital space, this methodology combines content architecture, entity management, and knowledge graph optimization. The method operates in three phases: extraction of core expertise, transformation into machine-readable formats, and integration into AI retrieval pathways. It ensures that when AI systems process queries in your domain, your brand appears as the definitive source.",
        category: "strategy",
        relatedTerms: ["geo", "knowledge-graph", "entity-optimization"],
        technicalDetails: "The method employs a three-phase transformation: Phase 1 (Extraction) identifies core expertise and unique insights through stakeholder interviews and content analysis. Phase 2 (Transformation) converts insights into structured formats using Schema.org vocabularies, JSON-LD, and entity relationship mapping. Phase 3 (Integration) distributes optimized content across platforms where AI systems conduct retrieval operations.",
        bestPractices: [
            "Begin with comprehensive expertise audit",
            "Map all entity relationships within your domain",
            "Create canonical definitions for industry terms",
            "Establish cross-platform entity consistency",
            "Monitor AI citation patterns and adjust accordingly"
        ]
    },
    {
        id: "rag",
        term: "Retrieval-Augmented Generation",
        definition: "An AI architecture that combines information retrieval with text generation to produce accurate, grounded responses.",
        detailedExplanation: "RAG systems represent a critical evolution in AI architecture. Rather than relying solely on training data, RAG models first search external knowledge bases or the web for relevant information, then use that retrieved context to generate responses. This two-step process significantly reduces hallucinations and enables AI systems to provide current, factual information. For GEO practitioners, understanding RAG architecture is essential because it reveals exactly how AI systems discover and select sources to cite. Major platforms like Perplexity AI, Google AI Overviews, and Bing Chat all employ RAG architectures.",
        category: "ai-systems",
        relatedTerms: ["geo", "knowledge-base", "ai-citations", "vector-search"],
        examples: [
            "Perplexity AI searching the web before generating answers",
            "ChatGPT with web browsing retrieving current information",
            "Google AI Overviews pulling from indexed sources"
        ],
        technicalDetails: "RAG systems typically use vector embeddings to represent both queries and potential source documents in high-dimensional space. Retrieval occurs through semantic similarity matching, often using approximate nearest neighbor algorithms. Retrieved passages are then injected into the generation context, allowing the model to ground its responses in specific sources. This architecture enables explicit citation and attribution.",
        bestPractices: [
            "Optimize content for semantic search",
            "Include clear, quotable statements of fact",
            "Structure content hierarchically for easy extraction",
            "Maintain high domain authority signals",
            "Use descriptive headings and section markers"
        ]
    },
    {
        id: "knowledge-graph",
        term: "Knowledge Graph",
        definition: "A structured representation of information connecting entities through defined relationships.",
        detailedExplanation: "Knowledge graphs form the semantic backbone of modern information systems. By representing entities and their relationships as nodes and edges, knowledge graphs enable AI systems to understand context, infer connections, and reason about information. For brands, appearing in major knowledge graphs like Google's Knowledge Graph, Wikidata, or specialized domain graphs is crucial for AI visibility. Knowledge graphs power entity recognition, disambiguation, and relationship understanding across AI platforms.",
        category: "data-structures",
        relatedTerms: ["entity", "semantic-web", "schema-org", "rdf"],
        examples: [
            "Google's Knowledge Graph showing company information in search results",
            "Wikidata storing structured information about organizations and concepts",
            "Industry-specific ontologies defining domain relationships"
        ],
        technicalDetails: "Knowledge graphs typically use RDF (Resource Description Framework) or property graph models. Nodes represent entities with unique identifiers, while edges encode relationships with semantic meaning. Graphs can be queried using languages like SPARQL or Cypher. Modern knowledge graphs often integrate with vector databases for hybrid retrieval combining structured and semantic search.",
        bestPractices: [
            "Claim and optimize your Google Knowledge Panel",
            "Create Wikidata entries for your organization",
            "Implement consistent entity identifiers across platforms",
            "Define clear relationships between your brand and industry concepts",
            "Use Schema.org markup to contribute to knowledge graph data"
        ]
    },
    {
        id: "entity",
        term: "Entity",
        definition: "A distinct, identifiable thing or concept with unique properties and relationships.",
        detailedExplanation: "In the context of GEO and semantic web, entities are the fundamental units of knowledge. An entity can be a person, organization, product, concept, event, or any uniquely identifiable thing. Proper entity management ensures AI systems can accurately identify and attribute information to your brand across different contexts. This involves entity disambiguation, consistent naming, and clear property definitions. Well-managed entities form the foundation of knowledge graph presence and AI understanding.",
        category: "data-structures",
        relatedTerms: ["knowledge-graph", "entity-disambiguation", "wikidata"],
        technicalDetails: "Entities are typically represented using unique identifiers like URIs or IRIs. Properties describe entity attributes using standardized vocabularies. Same-as relationships link entity representations across different systems. Entity resolution algorithms match textual mentions to canonical entities, enabling consistent identification across contexts.",
        bestPractices: [
            "Maintain consistent entity naming across all platforms",
            "Use official identifiers when available",
            "Define clear entity type classifications",
            "Establish relationships with related entities",
            "Implement entity markup using Schema.org types"
        ],
        commonMistakes: [
            "Using inconsistent brand names across platforms",
            "Failing to disambiguate from similar entities",
            "Neglecting to define entity relationships",
            "Missing proper entity type markup"
        ]
    },
    {
        id: "schema-org",
        term: "Schema.org Markup",
        definition: "A collaborative vocabulary standard for structured data on the web.",
        detailedExplanation: "Schema.org provides a comprehensive vocabulary for marking up web content with semantic information. Developed through collaboration between Google, Microsoft, Yahoo, and Yandex, Schema.org enables websites to provide explicit meaning to both search engines and AI systems. By embedding Schema.org markup in HTML, typically using JSON-LD format, websites communicate entity types, properties, and relationships. This structured data significantly improves how AI systems understand and utilize web content.",
        category: "technical",
        relatedTerms: ["structured-data", "json-ld", "semantic-markup"],
        examples: [
            "Organization schema defining company information and contact details",
            "Article schema marking up blog posts with author and publication data",
            "Product schema providing detailed product information for e-commerce"
        ],
        technicalDetails: "Schema.org markup typically uses JSON-LD (JavaScript Object Notation for Linked Data) embedded in HTML. The @context property defines the Schema.org vocabulary, @type specifies the entity type, and additional properties provide structured information. Nested types allow complex entity relationships. Validation tools like Google's Rich Results Test verify implementation.",
        bestPractices: [
            "Implement comprehensive Organization schema on your homepage",
            "Use Article schema with author and publication information",
            "Add Person schema for key team members",
            "Include BreadcrumbList for site navigation",
            "Implement FAQ schema for question-based content"
        ]
    },
    {
        id: "semantic-seo",
        term: "Semantic SEO",
        definition: "An evolution of SEO focusing on meaning, intent, and topical relationships rather than keywords.",
        detailedExplanation: "Semantic SEO represents the transition from keyword-centric optimization to meaning-centric optimization. It involves creating content structured around topics, entities, and relationships rather than individual keywords. This approach aligns with how modern search engines and AI systems understand content through natural language processing and semantic analysis. Semantic SEO forms the foundation for effective GEO, as AI systems rely heavily on semantic understanding to select sources.",
        category: "core-concepts",
        relatedTerms: ["geo", "entity-based-seo", "topic-clusters"],
        bestPractices: [
            "Organize content into comprehensive topic clusters",
            "Use natural language and varied terminology",
            "Answer questions at multiple depth levels",
            "Create pillar content covering topics exhaustively",
            "Link related content to establish topical authority"
        ],
        technicalDetails: "Semantic SEO leverages natural language processing concepts like entity recognition, relationship extraction, and topic modeling. Content is optimized not for keyword density but for semantic completeness, covering related concepts and answering implicit questions. Search engines and AI systems evaluate content using semantic similarity measures rather than keyword matching."
    },
    {
        id: "ai-citations",
        term: "AI Citations",
        definition: "Explicit references or attributions to specific sources in AI-generated responses.",
        detailedExplanation: "AI citations represent the primary success metric for GEO efforts. When an AI model explicitly references your brand or content in its response, it establishes your authority and drives direct attribution. Citations can appear as inline references, footnotes, or suggested reading. The frequency and context of citations indicate your brand's authority within AI systems' knowledge bases. Tracking citation patterns across different AI platforms provides critical feedback for GEO optimization.",
        category: "metrics",
        relatedTerms: ["source-attribution", "rag", "geo-metrics"],
        examples: [
            "Perplexity including your research paper in its answer sources",
            "ChatGPT referencing your documentation in technical explanations",
            "Claude citing your industry report in business analysis"
        ],
        technicalDetails: "AI systems employ different citation mechanisms. Some use numerical references linking to source lists, others provide inline hyperlinks, and some integrate attribution directly into generated text. Citation selection depends on retrieval relevance scores, source authority signals, and contextual fit. Monitoring requires systematic querying across platforms and tracking source attributions.",
        bestPractices: [
            "Create highly quotable, authoritative statements",
            "Ensure content is easily crawlable and indexable",
            "Maintain high domain authority signals",
            "Publish original research and data",
            "Structure content for easy extraction and citation"
        ]
    },
    {
        id: "vector-search",
        term: "Vector Search",
        definition: "Information retrieval using semantic similarity in high-dimensional vector space.",
        detailedExplanation: "Vector search powers modern AI retrieval systems by representing both queries and documents as numerical vectors that capture semantic meaning. Unlike keyword search which requires exact matches, vector search finds semantically similar content regardless of specific terminology. This technology enables RAG systems to retrieve relevant context even when queries use different words than source documents. Understanding vector search is essential for optimizing content for AI retrieval.",
        category: "ai-systems",
        relatedTerms: ["rag", "embeddings", "semantic-search"],
        technicalDetails: "Content is transformed into dense vector representations using neural embedding models like OpenAI's text-embedding models or open-source alternatives. Vectors typically have hundreds or thousands of dimensions. Retrieval uses cosine similarity or other distance metrics to find nearest neighbors. Vector databases like Pinecone, Weaviate, or Chroma enable efficient similarity search at scale.",
        bestPractices: [
            "Write clear, complete thoughts rather than keyword-stuffed text",
            "Use descriptive language that captures concepts thoroughly",
            "Include related terminology and synonyms naturally",
            "Structure content logically with clear sections",
            "Avoid technical jargon unless necessary for accuracy"
        ]
    },
    {
        id: "content-authenticity",
        term: "Content Authenticity",
        definition: "The verified trustworthiness and provenance of digital content.",
        detailedExplanation: "Content authenticity has become critical as AI systems must distinguish between reliable and unreliable information. Establishing authenticity involves clear authorship attribution, transparent publication dates, expert credentials, verifiable claims, and proper citations. AI systems increasingly weight authenticity signals when selecting sources to cite. Brands that demonstrate consistent content authenticity gain preference in AI retrieval systems.",
        category: "strategy",
        relatedTerms: ["e-e-a-t", "author-authority", "verifiable-claims"],
        bestPractices: [
            "Display clear authorship on all content",
            "Include author credentials and expertise",
            "Cite primary sources and research",
            "Maintain accurate publication and update dates",
            "Use author Schema markup with detailed profiles"
        ],
        technicalDetails: "Authenticity signals include structured author data, verified domain ownership, consistent publishing patterns, external references and backlinks, and social proof indicators. AI systems may also evaluate writing style consistency, factual accuracy against known sources, and temporal consistency of information."
    },
    {
        id: "e-e-a-t",
        term: "E-E-A-T",
        definition: "Experience, Expertise, Authoritativeness, and Trustworthiness - quality evaluation framework.",
        detailedExplanation: "E-E-A-T represents Google's quality evaluation framework, now equally relevant for GEO. Experience demonstrates first-hand knowledge, Expertise shows domain competence, Authoritativeness indicates recognition as a go-to source, and Trustworthiness ensures reliability. AI systems increasingly evaluate these signals when selecting sources. Demonstrating strong E-E-A-T characteristics significantly improves citation likelihood across AI platforms.",
        category: "strategy",
        relatedTerms: ["content-authenticity", "author-authority", "domain-authority"],
        bestPractices: [
            "Publish content demonstrating direct experience",
            "Highlight author expertise and credentials",
            "Build authoritative backlink profiles",
            "Maintain transparent, trustworthy practices",
            "Create comprehensive, accurate content"
        ]
    },
    {
        id: "json-ld",
        term: "JSON-LD",
        definition: "JavaScript Object Notation for Linked Data - preferred format for structured data.",
        detailedExplanation: "JSON-LD provides a way to encode linked data using JSON format. It has become the standard method for implementing Schema.org markup due to its ease of use and separation from HTML content. JSON-LD allows adding rich semantic information to web pages without modifying visible content. Search engines and AI systems can easily parse and understand JSON-LD, making it essential for GEO implementation.",
        category: "technical",
        relatedTerms: ["schema-org", "structured-data", "linked-data"],
        technicalDetails: "JSON-LD uses @context to define vocabularies, @type to specify entity types, and standard JSON syntax for properties. It supports nested structures, arrays, and cross-references using @id. Multiple JSON-LD blocks can coexist on a page, each describing different entities or aspects.",
        examples: [
            "Embedding organization information in website footer",
            "Marking up articles with author and publication data",
            "Defining product information for e-commerce listings"
        ]
    },
    {
        id: "entity-disambiguation",
        term: "Entity Disambiguation",
        definition: "The process of determining which specific entity a mention refers to when multiple entities share similar names.",
        detailedExplanation: "Entity disambiguation solves the problem of ambiguous references. When multiple entities share names or similar identifiers, disambiguation determines the correct entity based on context. For brands, proper disambiguation ensures AI systems correctly attribute information and avoid confusion with similarly named entities. This involves establishing unique identifiers, clear contextual signals, and consistent entity properties.",
        category: "data-structures",
        relatedTerms: ["entity", "knowledge-graph", "wikidata"],
        technicalDetails: "Disambiguation algorithms consider contextual clues like co-occurring entities, temporal information, geographic signals, and entity type consistency. Knowledge bases maintain canonical entity representations with unique identifiers. Same-as relationships link different mentions to canonical entities.",
        bestPractices: [
            "Use full legal names consistently",
            "Include disambiguating context in entity descriptions",
            "Maintain unique identifiers across platforms",
            "Establish clear entity relationships",
            "Use Schema.org sameAs property to link entity representations"
        ]
    },
    {
        id: "topic-clusters",
        term: "Topic Clusters",
        definition: "Content organization strategy connecting pillar content with related subtopic content.",
        detailedExplanation: "Topic clusters organize content around core themes, with comprehensive pillar pages covering broad topics and cluster content addressing specific subtopics. This structure establishes topical authority and helps both search engines and AI systems understand your expertise depth. Internal linking between pillar and cluster content reinforces topical relationships. For GEO, topic clusters demonstrate comprehensive knowledge coverage.",
        category: "strategy",
        relatedTerms: ["semantic-seo", "content-architecture", "pillar-content"],
        bestPractices: [
            "Create comprehensive pillar pages for core topics",
            "Develop detailed cluster content for subtopics",
            "Use consistent internal linking structure",
            "Cover topics exhaustively with varied content types",
            "Update content regularly to maintain relevance"
        ]
    },
    {
        id: "domain-authority",
        term: "Domain Authority",
        definition: "A metric predicting how well a website will rank based on its backlink profile and overall trust signals.",
        detailedExplanation: "While originally an SEO concept, domain authority remains relevant for GEO. AI systems consider domain authority signals when evaluating source trustworthiness. High authority domains receive preference in retrieval and citation decisions. Building domain authority involves earning quality backlinks, creating valuable content, maintaining technical excellence, and establishing brand recognition.",
        category: "metrics",
        relatedTerms: ["backlinks", "trust-signals", "page-authority"],
        bestPractices: [
            "Earn backlinks from authoritative sources",
            "Create link-worthy original content",
            "Maintain technical SEO best practices",
            "Build brand mentions across the web",
            "Establish thought leadership in your domain"
        ]
    },
    {
        id: "context-window",
        term: "Context Window",
        definition: "The maximum amount of text an AI model can process at one time, including both input and output.",
        detailedExplanation: "Context windows define how much information an AI system can consider when generating responses. For GEO, understanding context windows helps optimize content length and structure. When RAG systems retrieve your content, it must fit within the model's context window alongside the query and other retrieved passages. Modern models have expanding context windows, with some supporting hundreds of thousands of tokens. However, effective GEO still requires concise, focused content that delivers maximum value within reasonable token counts.",
        category: "ai-systems",
        relatedTerms: ["rag", "token-optimization", "content-chunking"],
        technicalDetails: "Context windows are measured in tokens, where one token approximately equals 4 characters in English. GPT-4 supports 8K-32K tokens, Claude supports up to 200K tokens, and newer models continue expanding. Retrieved content competes with queries and system prompts for context space. Chunking strategies break long documents into context-appropriate segments for retrieval.",
        bestPractices: [
            "Structure content in logical, self-contained sections",
            "Place key information early in content",
            "Use clear hierarchical organization",
            "Avoid unnecessary verbosity",
            "Create comprehensive but focused content pieces"
        ]
    },
    {
        id: "prompt-engineering",
        term: "Prompt Engineering",
        definition: "The practice of crafting effective instructions and queries to elicit desired responses from AI systems.",
        detailedExplanation: "While typically associated with AI usage, prompt engineering insights inform GEO strategy. Understanding how users query AI systems helps optimize content to match those query patterns. Effective GEO content anticipates the types of prompts users might give and structures information to be easily retrieved and cited in response. This involves analyzing common query patterns, question formats, and information-seeking behaviors in AI interfaces.",
        category: "strategy",
        relatedTerms: ["query-optimization", "user-intent", "information-retrieval"],
        examples: [
            "Structuring FAQs to match how users ask AI systems questions",
            "Creating content that answers both broad and specific queries",
            "Organizing information in formats that AI can easily extract and present"
        ],
        bestPractices: [
            "Research common questions in your domain",
            "Structure content to answer implicit follow-up questions",
            "Use clear, declarative statements",
            "Provide context that helps AI understand relevance",
            "Include both high-level summaries and detailed explanations"
        ]
    },
    {
        id: "citation-velocity",
        term: "Citation Velocity",
        definition: "The rate at which a source is cited by AI systems over time, indicating growing or declining authority.",
        detailedExplanation: "Citation velocity tracks how frequently AI systems reference your content across queries and platforms. Increasing citation velocity indicates growing recognition as an authoritative source. This metric helps evaluate GEO effectiveness and identify trending topics where your brand gains traction. Monitoring citation velocity across different AI platforms provides strategic insights for content development and optimization priorities.",
        category: "metrics",
        relatedTerms: ["ai-citations", "authority-signals", "geo-metrics"],
        bestPractices: [
            "Track citations across multiple AI platforms",
            "Monitor both quantity and context of citations",
            "Identify topics with growing citation patterns",
            "Analyze competitor citation trends",
            "Adjust content strategy based on citation data"
        ],
        technicalDetails: "Citation velocity measurement requires systematic querying of AI platforms with domain-relevant prompts, tracking source attributions over time. Tools and methodologies for citation tracking continue evolving as AI platforms mature. Velocity analysis considers citation frequency, context quality, and prominence within responses."
    },
    {
        id: "semantic-distance",
        term: "Semantic Distance",
        definition: "The measure of conceptual similarity between two pieces of content in vector space.",
        detailedExplanation: "Semantic distance determines how closely related content appears to AI systems using vector embeddings. Smaller semantic distances indicate higher relevance. For GEO, understanding semantic distance helps optimize content to align with target queries and related concepts. Content with minimal semantic distance to common queries in your domain receives preference in retrieval systems. This concept underlies how RAG systems select sources and why topical relevance matters more than keyword matching.",
        category: "ai-systems",
        relatedTerms: ["vector-search", "embeddings", "semantic-similarity"],
        technicalDetails: "Semantic distance is typically calculated using cosine similarity or Euclidean distance between vector embeddings. Embeddings are generated by neural models that encode semantic meaning into high-dimensional vectors. Distance metrics determine retrieval ranking in RAG systems. Reducing semantic distance between your content and target queries improves retrieval probability.",
        bestPractices: [
            "Use terminology natural to your domain",
            "Include related concepts and context",
            "Answer implicit questions within content",
            "Maintain topical focus throughout content",
            "Use varied expressions of core concepts"
        ]
    }
];
