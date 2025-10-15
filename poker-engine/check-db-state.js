// Check current database state in Supabase
require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabaseState() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking database state...\n');
    const client = await pool.connect();
    
    // 1. Check all tables
    console.log('📋 ALL TABLES:');
    const tables = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'auth')
      ORDER BY table_schema, table_name
    `);
    tables.rows.forEach(row => {
      console.log(`  ${row.table_schema}.${row.table_name}`);
    });
    
    // 2. Check auth.users
    console.log('\n👥 AUTH USERS:');
    const authUsers = await client.query('SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5');
    if (authUsers.rows.length > 0) {
      authUsers.rows.forEach(user => {
        console.log(`  ${user.id} | ${user.email} | ${user.created_at}`);
      });
    } else {
      console.log('  No auth users found');
    }
    
    // 3. Check user_profiles
    console.log('\n👤 USER PROFILES:');
    const profiles = await client.query('SELECT id, username, display_name FROM public.user_profiles ORDER BY created_at DESC LIMIT 5');
    if (profiles.rows.length > 0) {
      profiles.rows.forEach(profile => {
        console.log(`  ${profile.id} | ${profile.username} | ${profile.display_name}`);
      });
    } else {
      console.log('  No user profiles found');
    }
    
    // 4. Check rooms
    console.log('\n🏠 ROOMS:');
    const rooms = await client.query('SELECT id, name, host_user_id, invite_code, created_at FROM public.rooms ORDER BY created_at DESC LIMIT 5');
    if (rooms.rows.length > 0) {
      rooms.rows.forEach(room => {
        console.log(`  ${room.id} | ${room.name} | Host: ${room.host_user_id} | Code: ${room.invite_code}`);
      });
    } else {
      console.log('  No rooms found');
    }
    
    // 5. Check foreign key constraints
    console.log('\n🔗 FOREIGN KEY CONSTRAINTS:');
    const constraints = await client.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    constraints.rows.forEach(constraint => {
      console.log(`  ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
    
    // 6. Check for orphaned data
    console.log('\n🔍 ORPHANED DATA CHECK:');
    
    // Check rooms with invalid host_user_id
    const orphanedRooms = await client.query(`
      SELECT COUNT(*) as count 
      FROM public.rooms r 
      WHERE r.host_user_id IS NOT NULL 
      AND r.host_user_id NOT IN (SELECT id FROM auth.users)
    `);
    console.log(`  Rooms with invalid host_user_id: ${orphanedRooms.rows[0].count}`);
    
    // Check room_players with invalid user_id
    const orphanedPlayers = await client.query(`
      SELECT COUNT(*) as count 
      FROM public.room_players rp 
      WHERE rp.user_id IS NOT NULL 
      AND rp.user_id NOT IN (SELECT id FROM auth.users)
    `);
    console.log(`  Room players with invalid user_id: ${orphanedPlayers.rows[0].count}`);
    
    // Check room_seats with invalid user_id
    const orphanedSeats = await client.query(`
      SELECT COUNT(*) as count 
      FROM public.room_seats rs 
      WHERE rs.user_id IS NOT NULL 
      AND rs.user_id NOT IN (SELECT id FROM auth.users)
    `);
    console.log(`  Room seats with invalid user_id: ${orphanedSeats.rows[0].count}`);
    
    // 7. Check recent errors in logs (if any)
    console.log('\n📊 TABLE SIZES:');
    const tableSizes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname IN ('public', 'auth')
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    tableSizes.rows.forEach(table => {
      console.log(`  ${table.schemaname}.${table.tablename}: ${table.size}`);
    });
    
    client.release();
    console.log('\n✅ Database state check complete!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseState();
