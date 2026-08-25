box.cfg({ listen = 3301 })

local space = box.space.sensor_latest

if not space then
  space = box.schema.space.create('sensor_latest')
  space:create_index('primary', {
    parts = { { field = 'sensor_id', type = 'string' } },
    unique = true,
  })
end

space:format({
  { name = 'sensor_id', type = 'string' },
  { name = 'value', type = 'number' },
  { name = 'unit', type = 'string' },
  { name = 'metric', type = 'string' },
  { name = 'ts', type = 'number' },
  { name = 'site_id', type = 'string' },
  { name = 'line_id', type = 'string' },
})