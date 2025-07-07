import { Router, Request, Response } from 'express';

const router = Router();

// Simple GET endpoint for testing
router.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Test endpoint working!', 
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
});

// Test endpoint with parameters
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    message: `Test endpoint with ID: ${id}`,
    timestamp: new Date().toISOString(),
    method: 'GET',
    params: { id }
  });
});

// Simple POST endpoint for testing
router.post('/', (req: Request, res: Response) => {
  const body = req.body;
  res.json({
    message: 'Test POST endpoint working!',
    timestamp: new Date().toISOString(),
    method: 'POST',
    receivedData: body
  });
});

export default router;