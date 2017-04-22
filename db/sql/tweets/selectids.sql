SELECT id,
	CASE WHEN tweet_created_at::date >= now()::date -integer '1' THEN true
		ELSE false
	END as isfromtoday
  FROM tweets WHERE relevancetraffic <> 'negative' ORDER BY tweet_created_at DESC LIMIT 10;