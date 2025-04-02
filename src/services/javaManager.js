const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class JavaManager {
    constructor() {
        this.isWindows = process.platform === 'win32';
        this.minJavaVersion = 17;
        this.javaHome = process.env.JAVA_HOME;
    }

    async checkJavaVersion() {
        try {
            if (!this.javaHome) {
                return {
                    installed: false,
                    meetsRequirement: false,
                    version: null,
                    path: null
                };
            }

            const javaPath = this.isWindows
                ? path.join(this.javaHome, 'bin', 'java.exe')
                : path.join(this.javaHome, 'bin', 'java');

            try {
                await fs.access(javaPath);
            } catch (error) {
                return {
                    installed: false,
                    meetsRequirement: false,
                    version: null,
                    path: null
                };
            }

            const { stdout } = await execAsync(`"${javaPath}" -version 2>&1`);
            const versionMatch = stdout.match(/version "([^"]+)"/);
            
            if (!versionMatch) {
                return {
                    installed: false,
                    meetsRequirement: false,
                    version: null,
                    path: javaPath
                };
            }

            const version = versionMatch[1];
            const majorVersion = parseInt(version.split('.')[0]);
            const meetsRequirement = majorVersion >= this.minJavaVersion;

            return {
                installed: true,
                meetsRequirement,
                version,
                path: javaPath
            };
        } catch (error) {
            console.error('Error checking Java version:', error);
            return {
                installed: false,
                meetsRequirement: false,
                version: null,
                path: null
            };
        }
    }

    async createJavaInstallScript(nodeDir) {
        const scriptName = this.isWindows ? 'install_java.bat' : 'install_java.sh';
        const scriptPath = path.join(nodeDir, scriptName);

        let scriptContent;
        if (this.isWindows) {
            scriptContent = this.createWindowsInstallScript();
        } else {
            scriptContent = this.createUnixInstallScript();
        }

        await fs.writeFile(scriptPath, scriptContent);
        await fs.chmod(scriptPath, this.isWindows ? '666' : '755');

        return scriptPath;
    }

    createWindowsInstallScript() {
        return `@echo off
echo Installing Java ${this.minJavaVersion}...

:: Download OpenJDK
set "DOWNLOAD_URL=https://download.java.net/java/GA/jdk${this.minJavaVersion}/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-${this.minJavaVersion}_windows-x64_bin.zip"
set "ZIP_FILE=jdk.zip"

:: Download
powershell -Command "& {Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_FILE%'}"

:: Extract
powershell -Command "& {Expand-Archive -Path '%ZIP_FILE%' -DestinationPath 'C:\\Program Files\\Java' -Force}"

:: Set JAVA_HOME
setx JAVA_HOME "C:\\Program Files\\Java\\jdk-${this.minJavaVersion}" /M

:: Clean up
del %ZIP_FILE%

echo Java installation complete!
`;
    }

    createUnixInstallScript() {
        return `#!/bin/bash

echo "Installing Java ${this.minJavaVersion}..."

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
        sudo apt-get install -y openjdk-${this.minJavaVersion}-jdk
        ;;
    "CentOS Linux"|"Red Hat Enterprise Linux")
        sudo yum install -y java-${this.minJavaVersion}-openjdk-devel
        ;;
    "Amazon Linux")
        sudo yum install -y java-${this.minJavaVersion}-amazon-corretto-devel
        ;;
    *)
        echo "Unsupported operating system: $OS"
        exit 1
        ;;
esac

# Set JAVA_HOME
echo "export JAVA_HOME=/usr/lib/jvm/java-${this.minJavaVersion}-openjdk" >> ~/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> ~/.bashrc
source ~/.bashrc

echo "Java installation complete!"
`;
    }
}

module.exports = new JavaManager();