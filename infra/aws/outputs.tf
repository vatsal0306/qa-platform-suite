output "public_ip" {
  value = aws_instance.qa.public_ip
}

output "web_url" {
  value = "http://${aws_instance.qa.public_ip}:5173"
}

output "api_url" {
  value = "http://${aws_instance.qa.public_ip}:8000"
}
