-- ============================================================================
-- EcoRota USP — Massa de Dados de Demonstração (Seed)
-- Todas as operações respeitam integralmente as constraints e os 18 triggers.
-- Senha padrão das contas demo: EcoRota@2026
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. DESTINOS (Dim_Destino: 34 Unidades/Museus USP + 4 Restaurantes Universitários + 86 Estações do Metrô de SP = 124)
INSERT INTO Dim_Destino (tipo_destino, campus, restaurante, nome_destino, latitude, longitude, ativo) VALUES
    -- IDs 1..10 preservados para manter referências das viagens de demonstração
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Escola Politécnica (Poli)',                                        -23.5558, -46.7302, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Economia, Administração, Contabilidade e Atuária (FEA)', -23.5594, -46.7290, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Filosofia, Letras e Ciências Humanas (FFLCH)',        -23.5624, -46.7285, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Matemática e Estatística (IME)',                      -23.5597, -46.7316, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Física (IF)',                                         -23.5608, -46.7347, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Arquitetura e Urbanismo e de Design (FAU)',           -23.5597, -46.7294, 1),
    ('RESTAURANTE', 'Cidade Universitária', 'Restaurante Central',  'Bandejão Central — Cidade Universitária',                          -23.5595, -46.7310, 1),
    ('RESTAURANTE', 'Cidade Universitária', 'Restaurante Física',   'Bandejão da Física — Cidade Universitária',                        -23.5612, -46.7351, 1),
    ('RESTAURANTE', 'Cidade Universitária', 'Restaurante Química',  'Bandejão da Química — Cidade Universitária',                       -23.5639, -46.7263, 1),
    ('RESTAURANTE', 'Cidade Universitária', 'Restaurante PCO',      'Bandejão da Prefeitura (PCO)',                                     -23.5567, -46.7219, 1),
    -- Demais Unidades, Institutos e Museus da USP
    ('CAMPUS',      'USP Leste',            NULL,                   'Escola de Artes, Ciências e Humanidades (EACH)',                   -23.4824, -46.5008, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Escola de Comunicações e Artes (ECA)',                             -23.5567, -46.7277, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Escola de Educação Física e Esporte (EEFE)',                       -23.5553, -46.7166, 1),
    ('CAMPUS',      'Campus Saúde',         NULL,                   'Escola de Enfermagem (EE)',                                        -23.5559, -46.6710, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Ciências Farmacêuticas (FCF)',                        -23.5647, -46.7275, 1),
    ('CAMPUS',      'Largo São Francisco',  NULL,                   'Faculdade de Direito (FD)',                                        -23.5499, -46.6368, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Educação (FE)',                                       -23.5625, -46.7235, 1),
    ('CAMPUS',      'Campus Saúde',         NULL,                   'Faculdade de Medicina (FM)',                                       -23.5554, -46.6695, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Medicina Veterinária e Zootecnia (FMVZ)',             -23.5664, -46.7400, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Faculdade de Odontologia (FO)',                                    -23.5668, -46.7418, 1),
    ('CAMPUS',      'Campus Saúde',         NULL,                   'Faculdade de Saúde Pública (FSP)',                                 -23.5535, -46.6745, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Astronomia, Geofísica e Ciências Atmosféricas (IAG)', -23.5595, -46.7340, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Biociências (IB)',                                    -23.5656, -46.7304, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Ciências Biomédicas (ICB)',                           -23.5658, -46.7359, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Energia e Ambiente (IEE)',                            -23.5567, -46.7327, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Estudos Avançados (IEA)',                             -23.5582, -46.7281, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Estudos Brasileiros (IEB)',                           -23.5565, -46.7224, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Geociências (IGc)',                                   -23.5620, -46.7254, 1),
    ('CAMPUS',      'Campus Saúde',         NULL,                   'Instituto de Medicina Tropical de São Paulo (IMT)',                -23.5549, -46.6713, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Psicologia (IP)',                                     -23.5650, -46.7255, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Química (IQ)',                                        -23.5639, -46.7263, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto de Relações Internacionais (IRI)',                       -23.5587, -46.7292, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Instituto Oceanográfico (IO)',                                     -23.5606, -46.7317, 1),
    ('CAMPUS',      'Cidade Universitária', NULL,                   'Museu de Arqueologia e Etnologia',                                 -23.5648, -46.7166, 1),
    ('CAMPUS',      'Ibirapuera',           NULL,                   'Museu de Arte Contemporânea',                                      -23.5887, -46.6512, 1),
    ('CAMPUS',      'Ipiranga',             NULL,                   'Museu de Zoologia',                                                -23.5882, -46.6095, 1),
    ('CAMPUS',      'Ipiranga',             NULL,                   'Museu do Ipiranga',                                                -23.5855, -46.6097, 1),
    ('CAMPUS',      'Itu',                  NULL,                   'Museu Republicano de Itu',                                         -23.2643, -47.2992, 1),
    -- Estações do Metrô de São Paulo (Linhas 1-Azul, 2-Verde, 3-Vermelha, 4-Amarela, 5-Lilás e 15-Prata — 86 estações únicas)
    -- Linha 1-Azul
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Jabaquara',                      -23.6460, -46.6410, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Conceição',                      -23.6350, -46.6412, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô São Judas',                      -23.6255, -46.6409, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Saúde',                          -23.6185, -46.6393, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Praça da Árvore',                -23.6105, -46.6379, 1),
    ('CAMPUS',      'Metrô SP • Linhas 1-Azul / 5-Lilás',            NULL, 'Metrô Santa Cruz',                     -23.5989, -46.6367, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Vila Mariana',                   -23.5895, -46.6346, 1),
    ('CAMPUS',      'Metrô SP • Linhas 1-Azul / 2-Verde',            NULL, 'Metrô Ana Rosa',                       -23.5813, -46.6383, 1),
    ('CAMPUS',      'Metrô SP • Linhas 1-Azul / 2-Verde',            NULL, 'Metrô Paraíso',                        -23.5753, -46.6408, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Vergueiro',                      -23.5689, -46.6399, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô São Joaquim',                    -23.5618, -46.6387, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Japão-Liberdade',                -23.5552, -46.6356, 1),
    ('CAMPUS',      'Metrô SP • Linhas 1-Azul / 3-Vermelha',         NULL, 'Metrô Sé',                             -23.5503, -46.6333, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô São Bento',                      -23.5442, -46.6341, 1),
    ('CAMPUS',      'Metrô SP • Linhas 1-Azul / 4-Amarela',          NULL, 'Metrô Luz',                            -23.5365, -46.6332, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Tiradentes',                     -23.5311, -46.6323, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Armênia',                        -23.5253, -46.6291, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Portuguesa-Tietê',               -23.5159, -46.6251, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Carandiru',                      -23.5093, -46.6248, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Santana',                        -23.5026, -46.6247, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Jardim São Paulo-Ayrton Senna',  -23.4924, -46.6167, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Parada Inglesa',                 -23.4870, -46.6087, 1),
    ('CAMPUS',      'Metrô SP • Linha 1-Azul',                       NULL, 'Metrô Tucuruvi',                       -23.4804, -46.6031, 1),
    -- Linha 2-Verde
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Vila Madalena',                  -23.5465, -46.6908, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Sumaré',                         -23.5509, -46.6778, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Clínicas',                       -23.5542, -46.6709, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde (Int. Linha 4-Amarela)', NULL, 'Metrô Consolação',                   -23.5579, -46.6606, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Trianon-MASP',                   -23.5635, -46.6540, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Brigadeiro',                     -23.5685, -46.6476, 1),
    ('CAMPUS',      'Metrô SP • Linhas 2-Verde / 5-Lilás',           NULL, 'Metrô Chácara Klabin',                 -23.5926, -46.6305, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Santos-Imigrantes',              -23.5959, -46.6207, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Alto do Ipiranga',               -23.6022, -46.6125, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Sacomã',                         -23.6015, -46.6026, 1),
    ('CAMPUS',      'Metrô SP • Linha 2-Verde',                      NULL, 'Metrô Tamanduateí',                    -23.5929, -46.5897, 1),
    ('CAMPUS',      'Metrô SP • Linhas 2-Verde / 15-Prata',          NULL, 'Metrô Vila Prudente',                  -23.5844, -46.5820, 1),
    -- Linha 3-Vermelha
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Palmeiras-Barra Funda',          -23.5255, -46.6675, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Marechal Deodoro',               -23.5338, -46.6559, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Santa Cecília',                  -23.5389, -46.6491, 1),
    ('CAMPUS',      'Metrô SP • Linhas 3-Vermelha / 4-Amarela',      NULL, 'Metrô República',                      -23.5439, -46.6426, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Anhangabaú',                     -23.5479, -46.6391, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Pedro II',                       -23.5498, -46.6259, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Brás',                           -23.5478, -46.6159, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Bresser-Mooca',                  -23.5464, -46.6073, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Belém',                          -23.5432, -46.5897, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Tatuapé',                        -23.5403, -46.5766, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Carrão',                         -23.5378, -46.5642, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Penha',                          -23.5335, -46.5425, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Vila Matilde',                   -23.5319, -46.5309, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Guilhermina-Esperança',          -23.5294, -46.5167, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Patriarca-Vila Ré',              -23.5312, -46.5015, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Artur Alvim',                    -23.5404, -46.4846, 1),
    ('CAMPUS',      'Metrô SP • Linha 3-Vermelha',                   NULL, 'Metrô Corinthians-Itaquera',           -23.5423, -46.4711, 1),
    -- Linha 4-Amarela
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Higienópolis-Mackenzie',         -23.5489, -46.6522, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela (Int. Linha 2-Verde)', NULL, 'Metrô Paulista',                     -23.5553, -46.6621, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Oscar Freire',                   -23.5608, -46.6720, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Fradique Coutinho',              -23.5661, -46.6842, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Faria Lima',                     -23.5673, -46.6939, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Pinheiros',                      -23.5672, -46.7019, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Butantã',                        -23.5718, -46.7081, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô São Paulo-Morumbi',              -23.5861, -46.7238, 1),
    ('CAMPUS',      'Metrô SP • Linha 4-Amarela',                    NULL, 'Metrô Vila Sônia',                     -23.5929, -46.7347, 1),
    -- Linha 5-Lilás
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Capão Redondo',                  -23.6592, -46.7681, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Campo Limpo',                    -23.6492, -46.7588, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Vila das Belezas',               -23.6404, -46.7458, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Giovanni Gronchi',               -23.6439, -46.7341, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Santo Amaro',                    -23.6559, -46.7196, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Largo Treze',                    -23.6544, -46.7104, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Adolfo Pinheiro',                -23.6501, -46.7042, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Alto da Boa Vista',              -23.6417, -46.6994, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Borba Gato',                     -23.6334, -46.6927, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Brooklin',                       -23.6263, -46.6881, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Campo Belo',                     -23.6188, -46.6822, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Eucaliptos',                     -23.6099, -46.6687, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Moema',                          -23.6038, -46.6619, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô AACD-Servidor',                  -23.5979, -46.6524, 1),
    ('CAMPUS',      'Metrô SP • Linha 5-Lilás',                      NULL, 'Metrô Hospital São Paulo',             -23.5984, -46.6455, 1),
    -- Linha 15-Prata
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Oratório',                       -23.5820, -46.5621, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô São Lucas',                      -23.5889, -46.5447, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Camilo Haddad',                  -23.5955, -46.5376, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Vila Tolstói',                   -23.6009, -46.5272, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Vila União',                     -23.6029, -46.5156, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Jardim Planalto',                -23.6061, -46.5078, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Sapopemba',                      -23.6147, -46.5008, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Fazenda da Juta',                -23.6119, -46.4875, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô São Mateus',                     -23.6125, -46.4773, 1),
    ('CAMPUS',      'Metrô SP • Linha 15-Prata',                     NULL, 'Metrô Jardim Colonial',                -23.5999, -46.4694, 1);

-- 2. USUÁRIOS INSTITUCIONAIS (@usp.br)
INSERT INTO Usuario (nome_completo, nusp, email_institucional, telefone, senha_hash, status_conta, termos_aceitos_em, versao_termos, bio) VALUES
    ('Ana Beatriz Lima',     '14745101', 'ana.lima@usp.br',       '(11) 99123-4501', '__DEMO_PASSWORD_HASH__', 'ATIVA', '2026-08-01 09:00:00', '1.0', 'Estudante de Engenharia Mecatrônica na Poli-USP. Faço trajeto diário Butantã ↔ Poli.'),
    ('Bruno Henrique Silva', '14599302', 'bruno.silva@usp.br',    '(11) 99123-4502', '__DEMO_PASSWORD_HASH__', 'ATIVA', '2026-08-01 09:15:00', '1.0', 'Graduando em Ciência da Computação no IME. Curto caronas pontuais e música calma.'),
    ('Carla Mendes',         '13678003', 'carla.mendes@usp.br',   '(11) 99123-4503', '__DEMO_PASSWORD_HASH__', 'ATIVA', '2026-08-02 10:00:00', '1.0', 'Aluna de Economia na FEA-USP. Busco caronas nos horários de almoço para o Bandejão Central.'),
    ('Diego Ferreira',       '14612904', 'diego.ferreira@usp.br', '(11) 99123-4504', '__DEMO_PASSWORD_HASH__', 'ATIVA', '2026-08-02 10:30:00', '1.0', 'Pós-graduando em Física no IFUSP. Apoiador de mobilidade sustentável no campus.'),
    ('Elisa Nogueira',       '14700105', 'elisa.nogueira@usp.br', '(11) 99123-4505', '__DEMO_PASSWORD_HASH__', 'ATIVA', '2026-08-03 11:00:00', '1.0', 'Estudante de Arquitetura na FAU-USP. Sempre na linha Amarela pela manhã.');

-- 3. VEÍCULOS DOS MOTORISTAS
INSERT INTO Veiculo (id_usuario, marca, modelo, cor, placa, ano, capacidade_passageiros, ativo) VALUES
    (1, 'Volkswagen', 'Gol',   'Branco', 'ECO1A01', 2022, 3, 1),
    (2, 'Toyota',     'Etios', 'Prata',  'ECO2B02', 2021, 4, 1);

-- 4. VIAGENS HISTÓRICAS (criadas como DISPONIVEL -> reservas -> EM_ANDAMENTO -> CONCLUIDA para acionar triggers do Esquema Estrela)
INSERT INTO Viagem (
    id_motorista, id_veiculo, ponto_partida, latitude_partida, longitude_partida,
    id_destino, data_horario, previsao_chegada, vagas_total, modalidade_aprovacao,
    status_oferta, custo_combustivel_previsto, custo_pedagio_previsto, valor_rateio, distancia_km
) VALUES
    -- Viagem 1: Agosto / Manhã / Poli
    (1, 1, 'Metrô Butantã',                  -23.5718, -46.7081, 1, '2026-08-18 07:30:00', '2026-08-18 08:00:00', 3, 'AUTOMATICA', 'DISPONIVEL', 16.00, 0.00, 4.00, 8.2),
    -- Viagem 2: Setembro / Tarde / Bandejão Central
    (1, 1, 'Escola Politécnica (Poli)',      -23.5558, -46.7302, 7, '2026-09-10 12:15:00', '2026-09-10 12:35:00', 3, 'MANUAL',     'DISPONIVEL',  8.00, 0.00, 0.00, 4.5),
    -- Viagem 3: Outubro / Noite / FEA
    (2, 2, 'Metrô Pinheiros',                -23.5672, -46.7019, 2, '2026-10-15 18:30:00', '2026-10-15 19:05:00', 4, 'AUTOMATICA', 'DISPONIVEL', 25.00, 0.00, 5.00, 11.4),
    -- Viagem 4: Novembro / Manhã / Bandejão Física
    (2, 2, 'Metrô Vila Sônia',               -23.5929, -46.7347, 8, '2026-11-12 08:15:00', '2026-11-12 08:40:00', 3, 'AUTOMATICA', 'DISPONIVEL', 12.00, 0.00, 3.00, 6.8);

-- Paradas intermediárias das viagens históricas
INSERT INTO Parada_Viagem (id_viagem, ordem, descricao_local, latitude, longitude) VALUES
    (1, 1, 'Portão 1 USP (Rua Alvarenga)', -23.5651, -46.7124),
    (3, 1, 'Metrô Butantã - Terminal Sul', -23.5718, -46.7081);

-- Reservas nas viagens históricas
INSERT INTO Reserva (id_passageiro, id_viagem, status_reserva) VALUES
    (3, 1, 'CONFIRMADO'),
    (4, 1, 'CONFIRMADO'),
    (5, 2, 'PENDENTE_APROVACAO'),
    (3, 3, 'CONFIRMADO'),
    (4, 3, 'CONFIRMADO'),
    (5, 3, 'CONFIRMADO'),
    (3, 4, 'CONFIRMADO'),
    (5, 4, 'CONFIRMADO');

-- Aprovar reserva manual da viagem 2
UPDATE Reserva
   SET status_reserva = 'CONFIRMADO', decidida_em = '2026-09-10 11:45:00'
 WHERE id_viagem = 2 AND id_passageiro = 5;

-- Mensagens históricas de chat
INSERT INTO Mensagem (id_viagem, id_remetente, conteudo) VALUES
    (1, 3, 'Bom dia, Ana! Já estou esperando na saída da Rua Vital Brasil.'),
    (1, 1, 'Oi Carla! Chegando em 3 minutos, Gol branco placa ECO1A01.');

-- Transição de ciclo de vida das 4 viagens históricas (DISPONIVEL -> EM_ANDAMENTO -> CONCLUIDA)
UPDATE Viagem SET status_oferta = 'EM_ANDAMENTO' WHERE id_viagem IN (1, 2, 3, 4);

UPDATE Viagem SET status_oferta = 'CONCLUIDA', concluida_em = '2026-08-18 08:02:00' WHERE id_viagem = 1;
UPDATE Viagem SET status_oferta = 'CONCLUIDA', concluida_em = '2026-09-10 12:38:00' WHERE id_viagem = 2;
UPDATE Viagem SET status_oferta = 'CONCLUIDA', concluida_em = '2026-10-15 19:08:00' WHERE id_viagem = 3;
UPDATE Viagem SET status_oferta = 'CONCLUIDA', concluida_em = '2026-11-12 08:42:00' WHERE id_viagem = 4;

-- Avaliações pós-viagem (ECR009)
INSERT INTO Avaliacao (id_avaliador, id_avaliado, id_viagem, nota_quantitativa, observacao_qualitativa) VALUES
    (3, 1, 1, 5, 'Motorista super pontual e direção muito segura!'),
    (4, 1, 1, 5, 'Chegamos na Poli antes da aula. Recomendo muito.'),
    (1, 3, 1, 5, 'Passageira pontual e educada.'),
    (3, 2, 3, 5, 'Ótima carona no horário de pico, economizei quase 40 minutos!'),
    (5, 2, 3, 4, 'Muito bom, carro limpo e confortável.'),
    (2, 3, 3, 5, 'Excelente companhia de trajeto.');

-- 5. VIAGENS ATIVAS / DISPONÍVEIS FUTURAS (para pesquisa, reserva, aprovação manual e chat em tempo real)
INSERT INTO Viagem (
    id_motorista, id_veiculo, ponto_partida, latitude_partida, longitude_partida,
    id_destino, data_horario, previsao_chegada, vagas_total, modalidade_aprovacao,
    status_oferta, custo_combustivel_previsto, custo_pedagio_previsto, valor_rateio, distancia_km
) VALUES
    -- Viagem 5: Automática, amanhã manhã -> Poli
    (1, 1, 'Metrô Butantã',                  -23.5718, -46.7081, 1, '2026-11-23 07:45:00', '2026-11-23 08:15:00', 3, 'AUTOMATICA', 'DISPONIVEL', 16.00, 0.00, 4.00, 8.2),
    -- Viagem 6: Manual, amanhã almoço -> Bandejão Central (com solicitação pendente do Diego)
    (1, 1, 'Escola Politécnica (Poli)',      -23.5558, -46.7302, 7, '2026-11-23 12:00:00', '2026-11-23 12:20:00', 3, 'MANUAL',     'DISPONIVEL',  6.00, 0.00, 0.00, 4.5),
    -- Viagem 7: Automática, amanhã tarde -> IME
    (2, 2, 'Metrô Pinheiros',                -23.5672, -46.7019, 4, '2026-11-23 13:30:00', '2026-11-23 14:00:00', 4, 'AUTOMATICA', 'DISPONIVEL', 20.00, 0.00, 4.00, 10.5),
    -- Viagem 8: Manual, depois de amanhã noite -> FAU
    (2, 2, 'Metrô Faria Lima',               -23.5673, -46.6939, 6, '2026-11-24 18:15:00', '2026-11-24 18:50:00', 3, 'MANUAL',     'DISPONIVEL', 18.00, 0.00, 4.50, 9.6);

INSERT INTO Parada_Viagem (id_viagem, ordem, descricao_local, latitude, longitude) VALUES
    (5, 1, 'Portão 1 USP (Praça do Relógio)', -23.5651, -46.7124),
    (7, 1, 'Metrô Butantã - Terminal Sul',    -23.5718, -46.7081),
    (7, 2, 'Praça da Reitoria',               -23.5582, -46.7279);

-- Reservas ativas nas viagens futuras
INSERT INTO Reserva (id_passageiro, id_viagem, status_reserva) VALUES
    (3, 5, 'CONFIRMADO'),          -- Carla já confirmada na Viagem 5 (chat ativo!)
    (4, 6, 'PENDENTE_APROVACAO'),  -- Diego aguardando aprovação manual da Ana na Viagem 6 (ECR005)
    (5, 7, 'CONFIRMADO');          -- Elisa confirmada na Viagem 7

-- Mensagem ativa no chat da Viagem 5
INSERT INTO Mensagem (id_viagem, id_remetente, conteudo) VALUES
    (5, 1, 'Olá pessoal! Nosso embarque amanhã será na saída principal do Metrô Butantã às 07h45.'),
    (5, 3, 'Combinado Ana! Estarei lá às 07h40.');
