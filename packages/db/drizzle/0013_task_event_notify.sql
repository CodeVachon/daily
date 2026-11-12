-- Announce every task event (motte #33): LISTEN task_events gets a tiny JSON
-- payload (ids only) when the inserting transaction commits, whichever
-- process wrote it (web, MCP, sync worker).
CREATE FUNCTION notify_task_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('task_events', json_build_object(
    'seq', NEW.seq,
    'userId', NEW.user_id,
    'taskId', NEW.task_id,
    'actorType', NEW.actor_type,
    'clientId', NEW.actor_client_id
  )::text);
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER task_event_notify AFTER INSERT ON task_event
  FOR EACH ROW EXECUTE FUNCTION notify_task_event();
