locals {
  dot_env_regex  = "(?m:^\\s*([^#\\s]\\w*)\\s*=\\s*[\"']?(.*[^\"'\\s])[\"']?\\s*$)"
  global_dot_env = "../../env/.env"
  local_dot_env  = "../../env/.production.env"
  dot_env = merge(
    { for tuple in regexall(local.dot_env_regex, file(local.global_dot_env)) : tuple[0] => sensitive(tuple[1]) },
    { for tuple in regexall(local.dot_env_regex, file(local.local_dot_env)) : tuple[0] => sensitive(tuple[1]) }
  )
}
