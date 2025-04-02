#!/bin/bash

echo "Installing Java 17..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
fi

# Install Java based on OS
case $OS in
    "Ubuntu"|"Debian GNU/Linux")
        sudo apt-get update
        sudo apt-get install -y openjdk-17-jdk
        ;;
    "CentOS Linux"|"Red Hat Enterprise Linux")
        sudo yum install -y java-17-openjdk-devel
        ;;
    "Amazon Linux")
        sudo yum install -y java-17-amazon-corretto-devel
        ;;
    *)
        echo "Unsupported operating system: $OS"
        exit 1
        ;;
esac

# Set JAVA_HOME
echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk" >> ~/.bashrc
echo "export PATH=$JAVA_HOME/bin:$PATH" >> ~/.bashrc
source ~/.bashrc

echo "Java installation complete!"
