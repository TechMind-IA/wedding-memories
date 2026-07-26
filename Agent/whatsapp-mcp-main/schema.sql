-- Wedding Memories Analytics Schema
-- Run this to initialize the analytics database

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    chat_jid VARCHAR(255) UNIQUE NOT NULL,
    contact_name VARCHAR(255),
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    total_messages INTEGER DEFAULT 0,
    total_incoming INTEGER DEFAULT 0,
    total_outgoing INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255),
    chat_jid VARCHAR(255) NOT NULL,
    sender VARCHAR(255),
    content TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    is_from_me BOOLEAN DEFAULT FALSE,
    category VARCHAR(50),
    subcategory VARCHAR(50),
    sentiment VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (chat_jid) REFERENCES conversations(chat_jid)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    keywords TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    analysis_date DATE NOT NULL,
    total_messages INTEGER,
    unique_contacts INTEGER,
    category_distribution JSONB,
    hourly_distribution JSONB,
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evals table
CREATE TABLE IF NOT EXISTS evals (
    id SERIAL PRIMARY KEY,
    test_case_id VARCHAR(100) NOT NULL,
    test_name VARCHAR(255),
    input_text TEXT,
    response_text TEXT,
    passed BOOLEAN,
    reason TEXT,
    category VARCHAR(50),
    run_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent performance table
CREATE TABLE IF NOT EXISTS agent_performance (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    conversations_started INTEGER DEFAULT 0,
    conversations_completed INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),
    avg_response_time_ms INTEGER,
    common_objections JSONB,
    success_patterns JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_jid ON messages(chat_jid);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_evals_run_date ON evals(run_date);
CREATE INDEX IF NOT EXISTS idx_analysis_results_date ON analysis_results(analysis_date);

-- Insert default categories
INSERT INTO categories (name, description, keywords) VALUES
    ('preco', 'Objeções de preço', ARRAY['preço', 'quanto', 'valor', 'caro', 'barato', 'custa', 'pagamento', 'plano']),
    ('tecnologia', 'Dificuldades técnicas', ARRAY['não entendo', 'tecnologia', 'app', 'aplicativo', 'complicado', 'difícil']),
    ('fotografo', 'Questões sobre fotógrafo', ARRAY['fotógrafo', 'foto profissional', 'câmera']),
    ('localizacao', 'Questões de localização', ARRAY['longe', 'distância', 'outro estado', 'outro cidade']),
    ('indeciso', 'Clientes indecisos', ARRAY['pensar', 'depois', 'não sei', 'talvez', 'ainda não']),
    ('interesse', 'Sinais de interesse', ARRAY['quero', 'como funciona', 'me mostra', 'interesse', 'cadê']),
    ('agradecimento', 'Agradecimentos', ARRAY['obrigado', 'valeu', 'brigado']),
    ('objecao', 'Objeções diretas', ARRAY['não preciso', 'não quero', 'já tenho', 'não serve']),
    ('parceria', 'Parcerias', ARRAY['cerimonialista', 'parceria', 'comissão', 'indicar']),
    ('conversao', 'Intenção de compra', ARRAY['contratar', 'comprar', 'quero saber mais', 'próximo passo'])
ON CONFLICT (name) DO NOTHING;