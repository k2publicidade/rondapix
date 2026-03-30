import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Cria usuário admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ronda.local' },
    update: {},
    create: {
      email: 'admin@ronda.local',
      passwordHash: await hashPassword('Admin@123'),
      profile: {
        create: {
          username: 'admin',
        },
      },
      wallet: {
        create: {
          balance: 10000,
          lockedBalance: 0,
        },
      },
    },
  });

  // Cria alguns jogadores de teste
  const testPlayers = [
    { email: 'joao@ronda.local', username: 'joaozinho', balance: 5000 },
    { email: 'maria@ronda.local', username: 'mariazinha', balance: 3000 },
    { email: 'pedro@ronda.local', username: 'pedrao', balance: 2000 },
  ];

  for (const p of testPlayers) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: await hashPassword('Senha@123'),
        profile: {
          create: { username: p.username },
        },
        wallet: {
          create: { balance: p.balance, lockedBalance: 0 },
        },
      },
    });
  }

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('Usuários criados:');
  console.log('  admin@ronda.local     / Admin@123');
  console.log('  joao@ronda.local      / Senha@123');
  console.log('  maria@ronda.local     / Senha@123');
  console.log('  pedro@ronda.local     / Senha@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
