-- ============================================================================
-- EcoRota USP — Schema Oficial SQLite
-- Baseado em Entrega Entidade Relação/EcoRota_Prototipo.sqlite (PMR3304)
-- 15 tabelas | 12 índices | 6 views | 18 triggers
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. TABELAS DE DIMENSÃO E PARÂMETROS AMBIENTAIS
-- ----------------------------------------------------------------------------

CREATE TABLE Parametro_Ambiental (
    id_parametro           INTEGER PRIMARY KEY CHECK (id_parametro = 1),
    kg_co2_por_km          REAL NOT NULL CHECK (kg_co2_por_km > 0),
    kg_co2_por_arvore      REAL NOT NULL CHECK (kg_co2_por_arvore > 0),
    atualizado_em          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Dim_Tempo (
    id_tempo                INTEGER PRIMARY KEY,
    ano                     INTEGER NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
    mes                     INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    nome_mes                TEXT NOT NULL,
    trimestre               INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    UNIQUE (ano, mes),
    CHECK (id_tempo = ano * 100 + mes)
);

CREATE TABLE Dim_Destino (
    id_destino              INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_destino            TEXT NOT NULL
                            CHECK (tipo_destino IN ('CAMPUS','RESTAURANTE')),
    campus                  TEXT NOT NULL CHECK (length(trim(campus)) > 0),
    restaurante             TEXT,
    nome_destino            TEXT NOT NULL COLLATE NOCASE UNIQUE
                            CHECK (length(trim(nome_destino)) > 0),
    latitude                REAL CHECK (latitude BETWEEN -90 AND 90),
    longitude               REAL CHECK (longitude BETWEEN -180 AND 180),
    ativo                   INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
    CHECK (
        (tipo_destino = 'CAMPUS' AND restaurante IS NULL)
        OR
        (tipo_destino = 'RESTAURANTE' AND restaurante IS NOT NULL
         AND length(trim(restaurante)) > 0)
    )
);

CREATE TABLE Dim_Turno (
    id_turno                INTEGER PRIMARY KEY CHECK (id_turno IN (1,2,3)),
    nome_turno              TEXT NOT NULL UNIQUE
                            CHECK (nome_turno IN ('MANHA','TARDE','NOITE')),
    hora_inicio             TEXT NOT NULL,
    hora_fim                TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2. TABELAS OPERACIONAIS
-- ----------------------------------------------------------------------------

CREATE TABLE Usuario (
    id_usuario              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo           TEXT NOT NULL CHECK (length(trim(nome_completo)) > 0),
    nusp                    TEXT NOT NULL UNIQUE CHECK (length(trim(nusp)) > 0),
    email_institucional     TEXT NOT NULL COLLATE NOCASE UNIQUE
                            CHECK (lower(substr(email_institucional, -7)) = '@usp.br'),
    telefone                TEXT,
    senha_hash              TEXT NOT NULL,
    status_conta            TEXT NOT NULL DEFAULT 'PENDENTE_ATIVACAO'
                            CHECK (status_conta IN ('PENDENTE_ATIVACAO','ATIVA','BLOQUEADA','INATIVA')),
    termos_aceitos_em       TEXT NOT NULL,
    versao_termos           TEXT NOT NULL DEFAULT '1.0',
    foto                    BLOB,
    bio                     TEXT,
    falhas_login            INTEGER NOT NULL DEFAULT 0 CHECK (falhas_login >= 0),
    bloqueado_ate           TEXT,
    cadastrado_em           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Token_Usuario (
    id_token                INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario              INTEGER NOT NULL,
    finalidade              TEXT NOT NULL CHECK (finalidade IN ('ATIVACAO','RECUPERACAO')),
    token_hash              TEXT NOT NULL UNIQUE,
    criado_em               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em               TEXT NOT NULL,
    utilizado_em            TEXT,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Veiculo (
    id_veiculo              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario              INTEGER NOT NULL,
    marca                   TEXT NOT NULL,
    modelo                  TEXT NOT NULL,
    cor                     TEXT,
    placa                   TEXT COLLATE NOCASE UNIQUE,
    ano                     INTEGER CHECK (ano BETWEEN 1950 AND 2100),
    capacidade_passageiros  INTEGER NOT NULL CHECK (capacidade_passageiros BETWEEN 1 AND 8),
    ativo                   INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
    UNIQUE (id_veiculo, id_usuario),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Viagem (
    id_viagem                   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_motorista                INTEGER NOT NULL,
    id_veiculo                  INTEGER NOT NULL,
    ponto_partida               TEXT NOT NULL,
    latitude_partida            REAL NOT NULL CHECK (latitude_partida BETWEEN -90 AND 90),
    longitude_partida           REAL NOT NULL CHECK (longitude_partida BETWEEN -180 AND 180),
    id_destino                  INTEGER NOT NULL,
    data_horario                TEXT NOT NULL
                                CHECK (strftime('%Y-%m-%d %H:%M:%S', data_horario) IS NOT NULL
                                       AND strftime('%Y-%m-%d %H:%M:%S', data_horario) = data_horario),
    previsao_chegada            TEXT NOT NULL
                                CHECK (previsao_chegada > data_horario
                                       AND strftime('%Y-%m-%d %H:%M:%S', previsao_chegada) IS NOT NULL
                                       AND strftime('%Y-%m-%d %H:%M:%S', previsao_chegada) = previsao_chegada),
    vagas_total                 INTEGER NOT NULL CHECK (vagas_total BETWEEN 1 AND 8),
    modalidade_aprovacao        TEXT NOT NULL
                                CHECK (modalidade_aprovacao IN ('AUTOMATICA','MANUAL')),
    status_oferta               TEXT NOT NULL DEFAULT 'DISPONIVEL'
                                CHECK (status_oferta IN ('DISPONIVEL','EM_ANDAMENTO','CONCLUIDA','CANCELADA')),
    custo_combustivel_previsto  REAL NOT NULL DEFAULT 0 CHECK (custo_combustivel_previsto >= 0),
    custo_pedagio_previsto      REAL NOT NULL DEFAULT 0 CHECK (custo_pedagio_previsto >= 0),
    valor_rateio                REAL NOT NULL DEFAULT 0 CHECK (valor_rateio >= 0),
    distancia_km                REAL NOT NULL DEFAULT 0 CHECK (distancia_km >= 0),
    motivo_cancelamento         TEXT,
    concluida_em                TEXT,
    cancelada_em                TEXT,
    criada_em                   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Rateio sem fins lucrativos quando a lotacao esta completa.
    CHECK (valor_rateio * (vagas_total + 1) <=
           custo_combustivel_previsto + custo_pedagio_previsto + 0.01),
    FOREIGN KEY (id_destino) REFERENCES Dim_Destino(id_destino),
    FOREIGN KEY (id_motorista) REFERENCES Usuario(id_usuario),
    -- Garante que o veiculo pertence ao proprio motorista da viagem.
    FOREIGN KEY (id_veiculo, id_motorista)
        REFERENCES Veiculo(id_veiculo, id_usuario)
);

CREATE TABLE Parada_Viagem (
    id_parada               INTEGER PRIMARY KEY AUTOINCREMENT,
    id_viagem               INTEGER NOT NULL,
    ordem                   INTEGER NOT NULL CHECK (ordem >= 1),
    descricao_local         TEXT NOT NULL,
    latitude                REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude               REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    UNIQUE (id_viagem, ordem),
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem) ON DELETE CASCADE
);

CREATE TABLE Reserva (
    id_reserva                 INTEGER PRIMARY KEY AUTOINCREMENT,
    id_passageiro              INTEGER NOT NULL,
    id_viagem                  INTEGER NOT NULL,
    status_reserva             TEXT NOT NULL
                               CHECK (status_reserva IN (
                                   'PENDENTE_APROVACAO','CONFIRMADO','REJEITADO',
                                   'CANCELADO_PASSAGEIRO','CANCELADO_MOTORISTA')),
    justificativa_cancelamento TEXT,
    solicitada_em              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decidida_em                TEXT,
    cancelada_em               TEXT,
    UNIQUE (id_passageiro, id_viagem),
    FOREIGN KEY (id_passageiro) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem)
);

CREATE TABLE Mensagem (
    id_mensagem             INTEGER PRIMARY KEY AUTOINCREMENT,
    id_viagem               INTEGER NOT NULL,
    id_remetente            INTEGER NOT NULL,
    conteudo                TEXT NOT NULL CHECK (length(trim(conteudo)) > 0),
    enviada_em              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem),
    FOREIGN KEY (id_remetente) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Avaliacao (
    id_avaliacao            INTEGER PRIMARY KEY AUTOINCREMENT,
    id_avaliador            INTEGER NOT NULL,
    id_avaliado             INTEGER NOT NULL,
    id_viagem               INTEGER NOT NULL,
    nota_quantitativa       INTEGER NOT NULL CHECK (nota_quantitativa BETWEEN 1 AND 5),
    observacao_qualitativa  TEXT,
    criada_em               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (id_avaliador <> id_avaliado),
    UNIQUE (id_viagem, id_avaliador, id_avaliado),
    FOREIGN KEY (id_avaliador) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_avaliado) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem)
);

CREATE TABLE Notificacao (
    id_notificacao         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario             INTEGER NOT NULL,
    id_viagem              INTEGER,
    id_reserva             INTEGER,
    tipo                   TEXT NOT NULL,
    conteudo               TEXT NOT NULL,
    criada_em              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lida_em                TEXT,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem),
    FOREIGN KEY (id_reserva) REFERENCES Reserva(id_reserva)
);

CREATE TABLE Chamado_Suporte (
    numero_protocolo       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario             INTEGER,
    nome                   TEXT NOT NULL,
    email                  TEXT NOT NULL,
    categoria_assunto      TEXT NOT NULL,
    mensagem               TEXT NOT NULL CHECK (length(trim(mensagem)) > 0),
    status_chamado         TEXT NOT NULL DEFAULT 'ABERTO'
                           CHECK (status_chamado IN ('ABERTO','EM_ATENDIMENTO','RESOLVIDO','FECHADO')),
    criado_em              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

-- ----------------------------------------------------------------------------
-- 3. TABELA FATO MULTIDIMENSIONAL (ESQUEMA ESTRELA)
-- ----------------------------------------------------------------------------

CREATE TABLE Fato_Dashboard_Sustentavel (
    id_fato                         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_viagem                       INTEGER NOT NULL UNIQUE,
    id_tempo                        INTEGER NOT NULL,
    id_destino                      INTEGER NOT NULL,
    id_turno                        INTEGER NOT NULL,
    passageiros_transportados       INTEGER NOT NULL CHECK (passageiros_transportados >= 0),
    distancia_km                    REAL NOT NULL CHECK (distancia_km >= 0),
    kg_co2_por_km_aplicado          REAL NOT NULL CHECK (kg_co2_por_km_aplicado > 0),
    veiculos_individuais_evitados   INTEGER GENERATED ALWAYS AS
                                    (passageiros_transportados) STORED,
    estimativa_co2_economizado_kg   REAL GENERATED ALWAYS AS
                                    (ROUND(passageiros_transportados * distancia_km
                                           * kg_co2_por_km_aplicado, 3)) STORED,
    atualizado_em                   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem) ON DELETE CASCADE,
    FOREIGN KEY (id_tempo) REFERENCES Dim_Tempo(id_tempo),
    FOREIGN KEY (id_destino) REFERENCES Dim_Destino(id_destino),
    FOREIGN KEY (id_turno) REFERENCES Dim_Turno(id_turno)
);

-- ----------------------------------------------------------------------------
-- 4. ÍNDICES (12)
-- ----------------------------------------------------------------------------

CREATE INDEX idx_avaliacao_avaliado ON Avaliacao(id_avaliado);
CREATE INDEX idx_fato_dashboard_dimensoes ON Fato_Dashboard_Sustentavel(id_tempo, id_destino, id_turno);
CREATE INDEX idx_mensagem_viagem ON Mensagem(id_viagem, enviada_em);
CREATE INDEX idx_notificacao_usuario ON Notificacao(id_usuario, lida_em);
CREATE INDEX idx_parada_viagem ON Parada_Viagem(id_viagem, ordem);
CREATE INDEX idx_reserva_passageiro ON Reserva(id_passageiro);
CREATE INDEX idx_reserva_viagem_status ON Reserva(id_viagem, status_reserva);
CREATE INDEX idx_token_usuario ON Token_Usuario(id_usuario, finalidade, expira_em);
CREATE INDEX idx_veiculo_usuario ON Veiculo(id_usuario);
CREATE INDEX idx_viagem_busca ON Viagem(status_oferta, data_horario);
CREATE INDEX idx_viagem_destino_data ON Viagem(id_destino, data_horario);
CREATE INDEX idx_viagem_motorista ON Viagem(id_motorista, data_horario);

-- ----------------------------------------------------------------------------
-- 5. VIEWS (6)
-- ----------------------------------------------------------------------------

CREATE VIEW View_Dashboard_Sustentavel AS
SELECT T.id_tempo,
       T.ano,
       T.mes,
       T.nome_mes,
       printf('%04d-%02d', T.ano, T.mes) AS mes_referencia,
       D.id_destino,
       D.tipo_destino,
       D.campus,
       D.restaurante,
       D.nome_destino,
       TU.id_turno,
       TU.nome_turno AS turno,
       COUNT(F.id_viagem) AS total_viagens_concluidas,
       COALESCE(SUM(F.passageiros_transportados), 0) AS total_passageiros_transportados,
       COALESCE(SUM(F.veiculos_individuais_evitados), 0) AS total_veiculos_individuais_evitados,
       ROUND(COALESCE(SUM(F.distancia_km * F.veiculos_individuais_evitados), 0), 2)
           AS km_de_deslocamento_individual_evitados,
       ROUND(COALESCE(SUM(F.estimativa_co2_economizado_kg), 0), 3) AS estimativa_total_co2_economizado_kg
FROM Fato_Dashboard_Sustentavel F
JOIN Dim_Tempo T ON T.id_tempo = F.id_tempo
JOIN Dim_Destino D ON D.id_destino = F.id_destino
JOIN Dim_Turno TU ON TU.id_turno = F.id_turno
GROUP BY T.id_tempo, T.ano, T.mes, T.nome_mes,
         D.id_destino, D.tipo_destino, D.campus, D.restaurante, D.nome_destino,
         TU.id_turno, TU.nome_turno;

CREATE VIEW View_Dashboard_Sustentavel_Usuario AS
WITH Participacoes AS (
    SELECT V.id_motorista AS id_usuario,
           F.id_viagem, F.distancia_km, F.passageiros_transportados,
           F.estimativa_co2_economizado_kg
    FROM Fato_Dashboard_Sustentavel F
    JOIN Viagem V ON V.id_viagem = F.id_viagem
    UNION ALL
    SELECT R.id_passageiro AS id_usuario,
           F.id_viagem, F.distancia_km, F.passageiros_transportados,
           F.estimativa_co2_economizado_kg
    FROM Fato_Dashboard_Sustentavel F
    JOIN Reserva R ON R.id_viagem = F.id_viagem
                  AND R.status_reserva = 'CONFIRMADO'
)
SELECT U.id_usuario, U.nome_completo,
       COUNT(P.id_viagem) AS total_viagens_realizadas,
       ROUND(COALESCE(SUM(
           CASE WHEN P.passageiros_transportados > 0 THEN P.distancia_km ELSE 0 END
       ), 0), 2) AS total_km_compartilhados,
       ROUND(COALESCE(SUM(
           P.estimativa_co2_economizado_kg / (P.passageiros_transportados + 1.0)
       ), 0), 3) AS estimativa_co2_economizado_kg,
       ROUND(COALESCE(SUM(
           P.estimativa_co2_economizado_kg / (P.passageiros_transportados + 1.0)
           / PA.kg_co2_por_arvore
       ), 0), 4) AS equivalencia_arvores
FROM Usuario U
CROSS JOIN Parametro_Ambiental PA
LEFT JOIN Participacoes P ON P.id_usuario = U.id_usuario
GROUP BY U.id_usuario, U.nome_completo;

CREATE VIEW View_Historico_Usuario AS
SELECT V.id_motorista AS id_usuario, 'MOTORISTA' AS papel,
       V.id_viagem, V.ponto_partida, D.nome_destino AS destino_final,
       V.data_horario, V.status_oferta AS situacao, V.valor_rateio,
       (SELECT COUNT(*) FROM Reserva R WHERE R.id_viagem = V.id_viagem
           AND R.status_reserva = 'CONFIRMADO') AS participantes_passageiros
FROM Viagem V
JOIN Dim_Destino D ON D.id_destino = V.id_destino
WHERE V.status_oferta IN ('CONCLUIDA','CANCELADA')
UNION ALL
SELECT R.id_passageiro AS id_usuario, 'PASSAGEIRO' AS papel,
       V.id_viagem, V.ponto_partida, D.nome_destino AS destino_final,
       V.data_horario,
       CASE WHEN R.status_reserva LIKE 'CANCELADO_%'
            THEN R.status_reserva ELSE V.status_oferta END AS situacao,
       V.valor_rateio,
       (SELECT COUNT(*) FROM Reserva R2 WHERE R2.id_viagem = V.id_viagem
           AND R2.status_reserva = 'CONFIRMADO') AS participantes_passageiros
FROM Reserva R
JOIN Viagem V ON V.id_viagem = R.id_viagem
JOIN Dim_Destino D ON D.id_destino = V.id_destino
WHERE V.status_oferta IN ('CONCLUIDA','CANCELADA')
   OR R.status_reserva IN ('CANCELADO_PASSAGEIRO','CANCELADO_MOTORISTA');

CREATE VIEW View_Impacto_Total_Plataforma AS
SELECT COUNT(*) AS total_viagens_concluidas,
       COALESCE(SUM(passageiros_transportados), 0) AS total_passageiros_transportados,
       COALESCE(SUM(veiculos_individuais_evitados), 0) AS veiculos_individuais_evitados,
       ROUND(COALESCE(SUM(distancia_km * veiculos_individuais_evitados), 0), 2)
           AS km_de_deslocamento_individual_evitados,
       ROUND(COALESCE(SUM(estimativa_co2_economizado_kg), 0), 3) AS estimativa_total_co2_economizado_kg
FROM Fato_Dashboard_Sustentavel;

CREATE VIEW View_Reputacao_Usuario AS
SELECT U.id_usuario, U.nome_completo,
       COUNT(A.id_avaliacao) AS quantidade_avaliacoes,
       ROUND(COALESCE(AVG(A.nota_quantitativa), 0), 2) AS reputacao
FROM Usuario U
LEFT JOIN Avaliacao A ON A.id_avaliado = U.id_usuario
GROUP BY U.id_usuario, U.nome_completo;

CREATE VIEW View_Viagens_Com_Vagas AS
SELECT V.*,
       D.nome_destino AS destino_final,
       D.tipo_destino,
       D.campus,
       D.restaurante,
       D.latitude AS latitude_destino,
       D.longitude AS longitude_destino,
       V.vagas_total - (
           SELECT COUNT(*) FROM Reserva R
           WHERE R.id_viagem = V.id_viagem
             AND R.status_reserva = 'CONFIRMADO'
       ) AS vagas_disponiveis
FROM Viagem V
JOIN Dim_Destino D ON D.id_destino = V.id_destino;

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS (18)
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_avaliacao_identidade_imutavel
BEFORE UPDATE OF id_avaliador, id_avaliado, id_viagem ON Avaliacao
WHEN NEW.id_avaliador <> OLD.id_avaliador
  OR NEW.id_avaliado <> OLD.id_avaliado OR NEW.id_viagem <> OLD.id_viagem
BEGIN
    SELECT RAISE(ABORT, 'Avaliador, avaliado e viagem nao podem mudar');
END;

CREATE TRIGGER trg_avaliacao_validar_participacao
BEFORE INSERT ON Avaliacao
BEGIN
    SELECT CASE WHEN (SELECT status_oferta FROM Viagem
                       WHERE id_viagem = NEW.id_viagem) <> 'CONCLUIDA'
        THEN RAISE(ABORT, 'Avaliacoes apenas apos conclusao da viagem') END;
    SELECT CASE WHEN NOT (
        EXISTS (SELECT 1 FROM Viagem V WHERE V.id_viagem = NEW.id_viagem
                AND V.id_motorista = NEW.id_avaliador)
        OR EXISTS (SELECT 1 FROM Reserva R WHERE R.id_viagem = NEW.id_viagem
                AND R.id_passageiro = NEW.id_avaliador AND R.status_reserva = 'CONFIRMADO')
    ) THEN RAISE(ABORT, 'Avaliador nao participou da viagem') END;
    SELECT CASE WHEN NOT (
        EXISTS (SELECT 1 FROM Viagem V WHERE V.id_viagem = NEW.id_viagem
                AND V.id_motorista = NEW.id_avaliado)
        OR EXISTS (SELECT 1 FROM Reserva R WHERE R.id_viagem = NEW.id_viagem
                AND R.id_passageiro = NEW.id_avaliado AND R.status_reserva = 'CONFIRMADO')
    ) THEN RAISE(ABORT, 'Avaliado nao participou da viagem') END;
END;

CREATE TRIGGER trg_dashboard_atualizar_exclusao_reserva
AFTER DELETE ON Reserva
WHEN (SELECT status_oferta FROM Viagem WHERE id_viagem = OLD.id_viagem) = 'CONCLUIDA'
BEGIN
    UPDATE Fato_Dashboard_Sustentavel
       SET passageiros_transportados = (
               SELECT COUNT(*) FROM Reserva R
               WHERE R.id_viagem = OLD.id_viagem AND R.status_reserva = 'CONFIRMADO'
           ),
           atualizado_em = CURRENT_TIMESTAMP
     WHERE id_viagem = OLD.id_viagem;
END;

CREATE TRIGGER trg_dashboard_atualizar_reserva
AFTER UPDATE OF status_reserva ON Reserva
WHEN NEW.status_reserva <> OLD.status_reserva
 AND (SELECT status_oferta FROM Viagem WHERE id_viagem = NEW.id_viagem) = 'CONCLUIDA'
BEGIN
    UPDATE Fato_Dashboard_Sustentavel
       SET passageiros_transportados = (
               SELECT COUNT(*) FROM Reserva R
               WHERE R.id_viagem = NEW.id_viagem AND R.status_reserva = 'CONFIRMADO'
           ),
           atualizado_em = CURRENT_TIMESTAMP
     WHERE id_viagem = NEW.id_viagem;
END;

CREATE TRIGGER trg_dashboard_atualizar_viagem_concluida
AFTER UPDATE OF id_destino, data_horario, distancia_km ON Viagem
WHEN NEW.status_oferta = 'CONCLUIDA'
BEGIN
    INSERT OR IGNORE INTO Dim_Tempo (id_tempo, ano, mes, nome_mes, trimestre)
    VALUES (
        CAST(strftime('%Y', NEW.data_horario) AS INTEGER) * 100
            + CAST(strftime('%m', NEW.data_horario) AS INTEGER),
        CAST(strftime('%Y', NEW.data_horario) AS INTEGER),
        CAST(strftime('%m', NEW.data_horario) AS INTEGER),
        CASE CAST(strftime('%m', NEW.data_horario) AS INTEGER)
            WHEN 1 THEN 'JANEIRO' WHEN 2 THEN 'FEVEREIRO' WHEN 3 THEN 'MARCO'
            WHEN 4 THEN 'ABRIL' WHEN 5 THEN 'MAIO' WHEN 6 THEN 'JUNHO'
            WHEN 7 THEN 'JULHO' WHEN 8 THEN 'AGOSTO' WHEN 9 THEN 'SETEMBRO'
            WHEN 10 THEN 'OUTUBRO' WHEN 11 THEN 'NOVEMBRO' ELSE 'DEZEMBRO'
        END,
        CAST((CAST(strftime('%m', NEW.data_horario) AS INTEGER) + 2) / 3 AS INTEGER)
    );

    UPDATE Fato_Dashboard_Sustentavel
       SET id_tempo = CAST(strftime('%Y', NEW.data_horario) AS INTEGER) * 100
                      + CAST(strftime('%m', NEW.data_horario) AS INTEGER),
           id_destino = NEW.id_destino,
           id_turno = CASE
               WHEN CAST(strftime('%H', NEW.data_horario) AS INTEGER) BETWEEN 5 AND 11 THEN 1
               WHEN CAST(strftime('%H', NEW.data_horario) AS INTEGER) BETWEEN 12 AND 17 THEN 2
               ELSE 3
           END,
           distancia_km = NEW.distancia_km,
           atualizado_em = CURRENT_TIMESTAMP
     WHERE id_viagem = NEW.id_viagem;
END;

CREATE TRIGGER trg_dashboard_gerar_fato_conclusao
AFTER UPDATE OF status_oferta ON Viagem
WHEN NEW.status_oferta = 'CONCLUIDA' AND OLD.status_oferta <> 'CONCLUIDA'
BEGIN
    INSERT OR IGNORE INTO Dim_Tempo (id_tempo, ano, mes, nome_mes, trimestre)
    VALUES (
        CAST(strftime('%Y', NEW.data_horario) AS INTEGER) * 100
            + CAST(strftime('%m', NEW.data_horario) AS INTEGER),
        CAST(strftime('%Y', NEW.data_horario) AS INTEGER),
        CAST(strftime('%m', NEW.data_horario) AS INTEGER),
        CASE CAST(strftime('%m', NEW.data_horario) AS INTEGER)
            WHEN 1 THEN 'JANEIRO' WHEN 2 THEN 'FEVEREIRO' WHEN 3 THEN 'MARCO'
            WHEN 4 THEN 'ABRIL' WHEN 5 THEN 'MAIO' WHEN 6 THEN 'JUNHO'
            WHEN 7 THEN 'JULHO' WHEN 8 THEN 'AGOSTO' WHEN 9 THEN 'SETEMBRO'
            WHEN 10 THEN 'OUTUBRO' WHEN 11 THEN 'NOVEMBRO' ELSE 'DEZEMBRO'
        END,
        CAST((CAST(strftime('%m', NEW.data_horario) AS INTEGER) + 2) / 3 AS INTEGER)
    );

    INSERT INTO Fato_Dashboard_Sustentavel
        (id_viagem, id_tempo, id_destino, id_turno,
         passageiros_transportados, distancia_km, kg_co2_por_km_aplicado,
         atualizado_em)
    VALUES (
        NEW.id_viagem,
        CAST(strftime('%Y', NEW.data_horario) AS INTEGER) * 100
            + CAST(strftime('%m', NEW.data_horario) AS INTEGER),
        NEW.id_destino,
        CASE
            WHEN CAST(strftime('%H', NEW.data_horario) AS INTEGER) BETWEEN 5 AND 11 THEN 1
            WHEN CAST(strftime('%H', NEW.data_horario) AS INTEGER) BETWEEN 12 AND 17 THEN 2
            ELSE 3
        END,
        (SELECT COUNT(*) FROM Reserva R
         WHERE R.id_viagem = NEW.id_viagem AND R.status_reserva = 'CONFIRMADO'),
        NEW.distancia_km,
        (SELECT kg_co2_por_km FROM Parametro_Ambiental WHERE id_parametro = 1),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT(id_viagem) DO UPDATE SET
        id_tempo = excluded.id_tempo,
        id_destino = excluded.id_destino,
        id_turno = excluded.id_turno,
        passageiros_transportados = excluded.passageiros_transportados,
        distancia_km = excluded.distancia_km,
        kg_co2_por_km_aplicado = excluded.kg_co2_por_km_aplicado,
        atualizado_em = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER trg_mensagem_validar_participacao
BEFORE INSERT ON Mensagem
BEGIN
    SELECT CASE WHEN (SELECT status_oferta FROM Viagem
                       WHERE id_viagem = NEW.id_viagem) = 'CANCELADA'
        THEN RAISE(ABORT, 'Chat indisponivel para viagem cancelada') END;
    SELECT CASE WHEN NOT (
        EXISTS (SELECT 1 FROM Viagem V
                WHERE V.id_viagem = NEW.id_viagem AND V.id_motorista = NEW.id_remetente)
        OR EXISTS (SELECT 1 FROM Reserva R
                   WHERE R.id_viagem = NEW.id_viagem
                     AND R.id_passageiro = NEW.id_remetente
                     AND R.status_reserva = 'CONFIRMADO')
    ) THEN RAISE(ABORT, 'Remetente nao participa da viagem confirmada') END;
END;

CREATE TRIGGER trg_reserva_notificar_alteracao
AFTER UPDATE OF status_reserva ON Reserva
WHEN NEW.status_reserva <> OLD.status_reserva
BEGIN
    INSERT INTO Notificacao (id_usuario, id_viagem, id_reserva, tipo, conteudo)
    SELECT CASE WHEN NEW.status_reserva = 'CANCELADO_PASSAGEIRO'
                THEN V.id_motorista ELSE NEW.id_passageiro END,
           NEW.id_viagem, NEW.id_reserva,
           CASE NEW.status_reserva
                WHEN 'CONFIRMADO' THEN 'RESERVA_CONFIRMADA'
                WHEN 'REJEITADO' THEN 'RESERVA_REJEITADA'
                ELSE 'RESERVA_CANCELADA' END,
           CASE NEW.status_reserva
                WHEN 'CONFIRMADO' THEN 'Sua reserva foi confirmada.'
                WHEN 'REJEITADO' THEN 'Sua reserva foi rejeitada.'
                WHEN 'CANCELADO_PASSAGEIRO' THEN 'O passageiro cancelou sua reserva.'
                ELSE 'Sua reserva foi cancelada pelo motorista.' END
    FROM Viagem V WHERE V.id_viagem = NEW.id_viagem;
END;

CREATE TRIGGER trg_reserva_notificar_inclusao
AFTER INSERT ON Reserva
BEGIN
    INSERT INTO Notificacao (id_usuario, id_viagem, id_reserva, tipo, conteudo)
    SELECT V.id_motorista, NEW.id_viagem, NEW.id_reserva, 'NOVA_RESERVA',
           CASE WHEN NEW.status_reserva = 'PENDENTE_APROVACAO'
                THEN 'Existe uma solicitacao de reserva aguardando aprovacao.'
                ELSE 'Um passageiro confirmou automaticamente uma vaga.' END
    FROM Viagem V WHERE V.id_viagem = NEW.id_viagem;
END;

CREATE TRIGGER trg_reserva_validar_alteracao
BEFORE UPDATE OF status_reserva ON Reserva
WHEN NEW.status_reserva <> OLD.status_reserva
BEGIN
    SELECT CASE WHEN NOT (
        (OLD.status_reserva = 'PENDENTE_APROVACAO' AND
         NEW.status_reserva IN ('CONFIRMADO','REJEITADO','CANCELADO_PASSAGEIRO','CANCELADO_MOTORISTA'))
        OR
        (OLD.status_reserva = 'CONFIRMADO' AND
         NEW.status_reserva IN ('CANCELADO_PASSAGEIRO','CANCELADO_MOTORISTA'))
    ) THEN RAISE(ABORT, 'Transicao de status da reserva invalida') END;
    SELECT CASE WHEN NEW.status_reserva = 'CONFIRMADO' AND
        (SELECT status_oferta FROM Viagem WHERE id_viagem = NEW.id_viagem) <> 'DISPONIVEL'
        THEN RAISE(ABORT, 'Viagem nao disponivel para confirmacao') END;
    SELECT CASE WHEN NEW.status_reserva = 'CONFIRMADO' AND (
        SELECT COUNT(*) FROM Reserva R
        WHERE R.id_viagem = NEW.id_viagem AND R.status_reserva = 'CONFIRMADO'
    ) >= (SELECT vagas_total FROM Viagem WHERE id_viagem = NEW.id_viagem)
        THEN RAISE(ABORT, 'Nao existem vagas disponiveis') END;
END;

CREATE TRIGGER trg_reserva_validar_inclusao
BEFORE INSERT ON Reserva
BEGIN
    SELECT CASE WHEN (SELECT id_motorista FROM Viagem
                       WHERE id_viagem = NEW.id_viagem) = NEW.id_passageiro
        THEN RAISE(ABORT, 'Motorista nao pode reservar a propria viagem') END;
    SELECT CASE WHEN (SELECT status_conta FROM Usuario
                       WHERE id_usuario = NEW.id_passageiro) <> 'ATIVA'
        THEN RAISE(ABORT, 'Passageiro precisa ter conta ATIVA') END;
    SELECT CASE WHEN (SELECT status_oferta FROM Viagem
                       WHERE id_viagem = NEW.id_viagem) <> 'DISPONIVEL'
        THEN RAISE(ABORT, 'Viagem nao esta disponivel') END;
    SELECT CASE WHEN NEW.status_reserva <> (
        SELECT CASE WHEN modalidade_aprovacao = 'AUTOMATICA'
                    THEN 'CONFIRMADO' ELSE 'PENDENTE_APROVACAO' END
        FROM Viagem WHERE id_viagem = NEW.id_viagem
    ) THEN RAISE(ABORT, 'Status inicial incompativel com a modalidade') END;
    SELECT CASE WHEN NEW.status_reserva = 'CONFIRMADO' AND (
        SELECT COUNT(*) FROM Reserva R
        WHERE R.id_viagem = NEW.id_viagem AND R.status_reserva = 'CONFIRMADO'
    ) >= (SELECT vagas_total FROM Viagem WHERE id_viagem = NEW.id_viagem)
        THEN RAISE(ABORT, 'Nao existem vagas disponiveis') END;
END;

CREATE TRIGGER trg_reserva_vinculo_imutavel
BEFORE UPDATE OF id_passageiro, id_viagem ON Reserva
WHEN NEW.id_passageiro <> OLD.id_passageiro OR NEW.id_viagem <> OLD.id_viagem
BEGIN
    SELECT RAISE(ABORT, 'Passageiro e viagem de uma reserva nao podem mudar');
END;

CREATE TRIGGER trg_viagem_cancelar_reservas
AFTER UPDATE OF status_oferta ON Viagem
WHEN NEW.status_oferta = 'CANCELADA' AND OLD.status_oferta <> 'CANCELADA'
BEGIN
    UPDATE Reserva
       SET status_reserva = 'CANCELADO_MOTORISTA',
           cancelada_em = CURRENT_TIMESTAMP,
           justificativa_cancelamento = COALESCE(NEW.motivo_cancelamento, 'Viagem cancelada')
     WHERE id_viagem = NEW.id_viagem
       AND status_reserva IN ('PENDENTE_APROVACAO','CONFIRMADO');
END;

CREATE TRIGGER trg_viagem_habilitar_avaliacoes
AFTER UPDATE OF status_oferta ON Viagem
WHEN NEW.status_oferta = 'CONCLUIDA' AND OLD.status_oferta <> 'CONCLUIDA'
BEGIN
    INSERT INTO Notificacao (id_usuario, id_viagem, tipo, conteudo)
    SELECT NEW.id_motorista, NEW.id_viagem, 'AVALIACAO_DISPONIVEL',
           'Viagem concluida. Avalie seus participantes.';
    INSERT INTO Notificacao (id_usuario, id_viagem, tipo, conteudo)
    SELECT R.id_passageiro, NEW.id_viagem, 'AVALIACAO_DISPONIVEL',
           'Viagem concluida. Avalie os participantes.'
    FROM Reserva R
    WHERE R.id_viagem = NEW.id_viagem AND R.status_reserva = 'CONFIRMADO';
END;

CREATE TRIGGER trg_viagem_validar_alteracao_vagas
BEFORE UPDATE OF vagas_total ON Viagem
BEGIN
    SELECT CASE WHEN NEW.vagas_total < (
        SELECT COUNT(*) FROM Reserva R
        WHERE R.id_viagem = OLD.id_viagem AND R.status_reserva = 'CONFIRMADO'
    ) THEN RAISE(ABORT, 'Vagas totais menores que reservas confirmadas') END;
    SELECT CASE WHEN NEW.vagas_total > (
        SELECT capacidade_passageiros FROM Veiculo WHERE id_veiculo = NEW.id_veiculo
    ) THEN RAISE(ABORT, 'Vagas excedem capacidade do veiculo') END;
END;

CREATE TRIGGER trg_viagem_validar_edicao
BEFORE UPDATE OF id_motorista, id_veiculo, id_destino, data_horario, previsao_chegada ON Viagem
WHEN NEW.status_oferta IN ('DISPONIVEL','EM_ANDAMENTO')
BEGIN
    SELECT CASE WHEN (SELECT ativo FROM Veiculo
                       WHERE id_veiculo = NEW.id_veiculo) <> 1
        THEN RAISE(ABORT, 'Veiculo inativo') END;
    SELECT CASE WHEN (SELECT ativo FROM Dim_Destino
                       WHERE id_destino = NEW.id_destino) <> 1
        THEN RAISE(ABORT, 'Destino inexistente ou inativo') END;
    SELECT CASE WHEN NEW.vagas_total > (SELECT capacidade_passageiros
                                        FROM Veiculo WHERE id_veiculo = NEW.id_veiculo)
        THEN RAISE(ABORT, 'Vagas excedem capacidade do veiculo') END;
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM Viagem V
        WHERE V.id_motorista = NEW.id_motorista AND V.id_viagem <> NEW.id_viagem
          AND V.status_oferta IN ('DISPONIVEL','EM_ANDAMENTO')
          AND NEW.data_horario < V.previsao_chegada
          AND NEW.previsao_chegada > V.data_horario
    ) THEN RAISE(ABORT, 'Conflito de horario com outra viagem') END;
END;

CREATE TRIGGER trg_viagem_validar_encerramento
BEFORE UPDATE OF status_oferta ON Viagem
WHEN NEW.status_oferta <> OLD.status_oferta
BEGIN
    SELECT CASE
        WHEN OLD.status_oferta IN ('CANCELADA','CONCLUIDA')
          THEN RAISE(ABORT, 'Viagem encerrada nao pode ser reaberta')
        WHEN NEW.status_oferta = 'CONCLUIDA' AND OLD.status_oferta <> 'EM_ANDAMENTO'
          THEN RAISE(ABORT, 'Viagem precisa estar EM_ANDAMENTO para conclusao')
        WHEN NEW.status_oferta = 'EM_ANDAMENTO' AND OLD.status_oferta <> 'DISPONIVEL'
          THEN RAISE(ABORT, 'Viagem precisa estar DISPONIVEL para inicio')
    END;
END;

CREATE TRIGGER trg_viagem_validar_inclusao
BEFORE INSERT ON Viagem
BEGIN
    SELECT CASE WHEN (SELECT status_conta FROM Usuario
                       WHERE id_usuario = NEW.id_motorista) <> 'ATIVA'
        THEN RAISE(ABORT, 'Motorista precisa ter conta ATIVA') END;
    SELECT CASE WHEN (SELECT ativo FROM Veiculo
                       WHERE id_veiculo = NEW.id_veiculo) <> 1
        THEN RAISE(ABORT, 'Veiculo inativo') END;
    SELECT CASE WHEN (SELECT ativo FROM Dim_Destino
                       WHERE id_destino = NEW.id_destino) <> 1
        THEN RAISE(ABORT, 'Destino inexistente ou inativo') END;
    SELECT CASE WHEN NEW.vagas_total > (SELECT capacidade_passageiros
                                        FROM Veiculo WHERE id_veiculo = NEW.id_veiculo)
        THEN RAISE(ABORT, 'Vagas excedem capacidade do veiculo') END;
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM Viagem V
        WHERE V.id_motorista = NEW.id_motorista
          AND V.status_oferta IN ('DISPONIVEL','EM_ANDAMENTO')
          AND NEW.data_horario < V.previsao_chegada
          AND NEW.previsao_chegada > V.data_horario
    ) THEN RAISE(ABORT, 'Conflito de horario com outra viagem') END;
END;

-- ----------------------------------------------------------------------------
-- 7. CARGA FIXA DE PARÂMETROS E DIMENSÃO TURNO (IGUAL AO PROTÓTIPO)
-- ----------------------------------------------------------------------------

INSERT OR IGNORE INTO Dim_Turno (id_turno, nome_turno, hora_inicio, hora_fim) VALUES
    (1, 'MANHA', '05:00', '11:59'),
    (2, 'TARDE', '12:00', '17:59'),
    (3, 'NOITE', '18:00', '04:59');

INSERT OR IGNORE INTO Parametro_Ambiental (id_parametro, kg_co2_por_km, kg_co2_por_arvore) VALUES
    (1, 0.12, 20.0);
