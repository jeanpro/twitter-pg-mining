INSERT INTO hashtags (name, relevancetraffic, relevancedisaster) VALULES($1,$2,$3) ON CONFLICT(name) DO UPDATE 
	SET relevancetraffic = $2
	SET relevancedisaster = $3