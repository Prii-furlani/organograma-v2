import bcrypt from 'bcryptjs';
import pool from '../database/database.js';

const SENHA_PADRAO = 'JHE@2026';
const SALT_ROUNDS = 10;

export async function resetarSenhasPadrao() {
  console.log(`================================================================`);
  console.log(` RESET DE SENHAS PADRÃO — JHE ORGANOGRAMA CORPORATIVO`);
  console.log(` Senha provisória definida: "${SENHA_PADRAO}"`);
  console.log(`================================================================`);

  try {
    const hash = await bcrypt.hash(SENHA_PADRAO, SALT_ROUNDS);
    console.log(`[BCRYPT] Hash gerado com sucesso: ${hash}`);

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET senha = ?, atualizado_em = NOW()
       WHERE email IN (
         'governanca@jhe.com.br',
         'diretoria@jhe.com.br',
         'diretoria.viol@jhe.com.br',
         'leandro.neves@jhe.com.br',
         'oia@jhe.com.br',
         'staff@jhe.com.br',
         'projetos@jhe.com.br',
         'carlos.almeida@jhe.com.br'
       )` ,
      [hash]
    );

    console.log(`[MYSQL] Senhas atualizadas para ${result.affectedRows} usuários institucionais.`);

    // Validação imediata
    const [usuarios] = await pool.query(
      `SELECT id, nome, email, senha FROM usuarios WHERE email = 'governanca@jhe.com.br'`
    );

    if (usuarios.length > 0) {
      const match = await bcrypt.compare(SENHA_PADRAO, usuarios[0].senha);
      console.log(`[TESTE] Validação bcrypt para "${usuarios[0].email}":`, match ? 'SUCESSO (VÁLIDO)' : 'FALHA');
    }

    console.log(`================================================================`);
    return { sucesso: true, atualizados: result.affectedRows };
  } catch (error) {
    console.error('[ERRO] Falha ao redefinir senhas padrão:', error);
    throw error;
  }
}

// Executa diretamente caso chamado via linha de comando (CLI)
if (process.argv[1]?.endsWith('resetPasswords.js')) {
  resetarSenhasPadrao()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
