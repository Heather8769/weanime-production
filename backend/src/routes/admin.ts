import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { 
  validateUpdateUserRole,
  validateUpdateUserStatus,
  validateBulkUserAction,
  validateModerateContent,
  validateUpdateSystemSetting,
  validateAnalyticsQuery,
  validateMaintenanceAction,
  validateBackupRequest,
  validateCacheAction,
  validateAdminUserQuery
} from '../validation/middleware/admin.js';

const router = Router();

// Lazy initialization of Supabase client
let supabaseClient: any = null;

const getSupabase = () => {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error(`Supabase configuration missing: URL=${!!url}, KEY=${!!key}`);
    }
    
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

/**
 * GET /admin/users
 * Get all users with filtering and pagination (Admin only)
 */
router.get('/users', authenticate, requireAdmin, validateAdminUserQuery, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      search, 
      role, 
      is_active, 
      email_verified,
      registration_date_start,
      registration_date_end,
      last_login_start,
      last_login_end,
      sort_by, 
      order, 
      page, 
      limit 
    } = req.query as any;
    
    const offset = (page - 1) * limit;
    
    let query = getSupabase()
      .from('user_profiles')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%, username.ilike.%${search}%, display_name.ilike.%${search}%`);
    }
    
    if (role) {
      query = query.eq('role', role);
    }
    
    if (typeof is_active === 'boolean') {
      query = query.eq('is_active', is_active);
    }
    
    if (typeof email_verified === 'boolean') {
      query = query.eq('email_verified', email_verified);
    }
    
    if (registration_date_start) {
      query = query.gte('created_at', registration_date_start);
    }
    
    if (registration_date_end) {
      query = query.lte('created_at', registration_date_end);
    }
    
    if (last_login_start) {
      query = query.gte('last_login_at', last_login_start);
    }
    
    if (last_login_end) {
      query = query.lte('last_login_at', last_login_end);
    }
    
    // Apply sorting
    query = query.order(sort_by, { ascending: order === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch users'
    });
  }
});

/**
 * PUT /admin/users/:id/role
 * Update user role (Admin only)
 */
router.put('/users/:id/role', authenticate, requireAdmin, validateUpdateUserRole, async (req: AuthenticatedRequest, res) => {
  try {
    const { user_id, role } = req.body;
    
    // Prevent self-role modification
    if (user_id === req.auth?.user.id) {
      res.status(400).json({
        error: 'Cannot modify own role',
        message: 'You cannot change your own role'
      });
      return;
    }
    
    const { data, error } = await getSupabase()
      .from('user_profiles')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ 
          error: 'User not found',
          message: 'The user to update does not exist'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update user role'
    });
  }
});

/**
 * PUT /admin/users/:id/status
 * Update user active status (Admin only)
 */
router.put('/users/:id/status', authenticate, requireAdmin, validateUpdateUserStatus, async (req: AuthenticatedRequest, res) => {
  try {
    const { user_id, is_active } = req.body;
    
    // Prevent self-status modification
    if (user_id === req.auth?.user.id) {
      res.status(400).json({
        error: 'Cannot modify own status',
        message: 'You cannot change your own account status'
      });
      return;
    }
    
    const { data, error } = await getSupabase()
      .from('user_profiles')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ 
          error: 'User not found',
          message: 'The user to update does not exist'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update user status'
    });
  }
});

/**
 * POST /admin/users/bulk-action
 * Perform bulk actions on users (Admin only)
 */
router.post('/users/bulk-action', authenticate, requireAdmin, validateBulkUserAction, async (req: AuthenticatedRequest, res) => {
  try {
    const { user_ids, action, reason } = req.body;
    const currentUserId = req.auth?.user.id;
    
    // Prevent actions on self
    if (user_ids.includes(currentUserId)) {
      res.status(400).json({
        error: 'Cannot perform bulk action on self',
        message: 'You cannot perform bulk actions on your own account'
      });
      return;
    }
    
    let updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    switch (action) {
      case 'activate':
        updateData.is_active = true;
        break;
      case 'deactivate':
        updateData.is_active = false;
        break;
      case 'delete':
        // For delete, we'll handle it separately
        break;
      default:
        res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be activate, deactivate, or delete'
        });
        return;
    }
    
    let result;
    
    if (action === 'delete') {
      // Delete users (be careful with this)
      const { error } = await getSupabase()
        .from('user_profiles')
        .delete()
        .in('id', user_ids);
      
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      
      result = { count: user_ids.length };
    } else {
      // Update users
      const { data, error, count } = await getSupabase()
        .from('user_profiles')
        .update(updateData)
        .in('id', user_ids)
        .select();
      
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      
      result = { data, count };
    }
    
    res.json({
      ...result,
      message: `Bulk ${action} completed successfully`
    });
  } catch (error) {
    console.error('Error performing bulk user action:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to perform bulk action'
    });
  }
});

/**
 * GET /admin/analytics
 * Get system analytics (Admin only)
 */
router.get('/analytics', authenticate, requireAdmin, validateAnalyticsQuery, async (req: AuthenticatedRequest, res) => {
  try {
    const { metric, period, start_date, end_date, group_by, filters } = req.query as any;
    
    let data: any = {};
    
    switch (metric) {
      case 'user_registrations':
        const { count: userCount } = await getSupabase()
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .gte('created_at', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', end_date || new Date().toISOString());
        data = { total_registrations: userCount };
        break;
        
      case 'user_activity':
        const { count: activeUsers } = await getSupabase()
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .gte('last_login_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        data = { active_users_7_days: activeUsers };
        break;
        
      case 'content_views':
        const { count: totalViews } = await getSupabase()
          .from('watch_sessions')
          .select('id', { count: 'exact' })
          .gte('session_start', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        data = { total_views: totalViews };
        break;
        
      case 'popular_anime':
        const { data: popularAnime } = await getSupabase()
          .from('anime_cache')
          .select('title, score')
          .order('score', { ascending: false })
          .limit(10);
        data = { popular_anime: popularAnime };
        break;
        
      default:
        res.status(400).json({
          error: 'Invalid metric',
          message: 'Metric not supported'
        });
        return;
    }
    
    res.json({
      metric,
      period,
      data,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /admin/system-status
 * Get system status and health (Admin only)
 */
router.get('/system-status', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Check database connectivity
    const { data: dbTest, error: dbError } = await getSupabase()
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    const dbStatus = dbError ? 'unhealthy' : 'healthy';
    
    // Get basic stats
    const [userCount, animeCount, episodeCount] = await Promise.all([
      getSupabase().from('user_profiles').select('id', { count: 'exact' }),
      getSupabase().from('anime_cache').select('id', { count: 'exact' }),
      getSupabase().from('episodes').select('id', { count: 'exact' })
    ]);
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        api: 'healthy'
      },
      statistics: {
        total_users: userCount.count || 0,
        total_anime: animeCount.count || 0,
        total_episodes: episodeCount.count || 0
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch system status'
    });
  }
});

/**
 * POST /admin/maintenance
 * Manage system maintenance (Admin only)
 */
router.post('/maintenance', authenticate, requireAdmin, validateMaintenanceAction, async (req: AuthenticatedRequest, res) => {
  try {
    const { action, duration_minutes, scheduled_time, message, affected_services } = req.body;
    
    // This would typically interact with a maintenance system
    // For now, we'll just log the action and return success
    console.log('Maintenance action:', { action, duration_minutes, scheduled_time, message, affected_services });
    
    res.json({
      action,
      status: 'success',
      message: `Maintenance ${action} scheduled successfully`,
      details: {
        duration_minutes,
        scheduled_time,
        affected_services: affected_services || ['api']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error managing maintenance:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to manage maintenance'
    });
  }
});

/**
 * POST /admin/backup
 * Create system backup (Admin only)
 */
router.post('/backup', authenticate, requireAdmin, validateBackupRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, include_media, compression, retention_days } = req.body;
    
    // This would typically trigger a backup process
    // For now, we'll simulate the backup creation
    const backupId = `backup_${Date.now()}`;
    
    console.log('Backup requested:', { type, include_media, compression, retention_days });
    
    res.json({
      backup_id: backupId,
      status: 'initiated',
      type,
      include_media,
      compression,
      retention_days,
      estimated_completion: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      message: 'Backup initiated successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create backup'
    });
  }
});

/**
 * POST /admin/cache
 * Manage system cache (Admin only)
 */
router.post('/cache', authenticate, requireAdmin, validateCacheAction, async (req: AuthenticatedRequest, res) => {
  try {
    const { action, cache_type, specific_keys } = req.body;
    
    // This would typically interact with a caching system (Redis, etc.)
    // For now, we'll simulate cache management
    console.log('Cache action:', { action, cache_type, specific_keys });
    
    let message = '';
    switch (action) {
      case 'clear':
        message = `${cache_type} cache cleared successfully`;
        break;
      case 'warm':
        message = `${cache_type} cache warmed successfully`;
        break;
      case 'invalidate':
        message = `${cache_type} cache invalidated successfully`;
        break;
    }
    
    res.json({
      action,
      cache_type,
      status: 'success',
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error managing cache:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to manage cache'
    });
  }
});

/**
 * GET /admin/logs
 * Get system logs (Admin only)
 */
router.get('/logs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const level = req.query.level || 'info';
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    
    // This would typically read from log files or a logging service
    // For now, we'll return a simulated log response
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System status check completed',
        service: 'health-check'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'User authentication successful',
        service: 'auth'
      }
    ];
    
    res.json({
      logs,
      total: logs.length,
      level,
      limit
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch logs'
    });
  }
});

export default router;