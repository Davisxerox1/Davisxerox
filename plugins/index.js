import chalk from 'chalk'
import express from 'express'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import path from 'path'
import { setupMaster, fork } from 'cluster'
import { watchFile, unwatchFile } from 'fs'
import { createInterface } from 'readline'

const app = express()
const port = process.env.PORT || 5000

const rl = createInterface(process.stdin, process.stdout)
const __dirname = dirname(fileURLToPath(import.meta.url))
const args = [join(__dirname, 'firemd.js'), ...process.argv.slice(2)]

app.use(express.static(path.join(__dirname, 'Assets')));

app.get('/', (req, res) => {
  res.redirect('/fire.html');
});

app.listen(port, () => {
  console.log(chalk.green(`Port ${port} is open`))
})

var isRunning = false
function start(file) {
	if (isRunning) return
	isRunning = true
	setupMaster({
		exec: args[0],
		args: args.slice(1),
	})
	let p = fork()
	p.on('message', data => {
		console.log('[RECEIVED]', data)
		switch (data) {
			case 'reset':
				p.process.kill()
				isRunning = false
				start.apply(this, arguments)
				break
			case 'uptime':
				p.send(process.uptime())
				break
		}
	})
	p.on('exit', (_, code) => {
		isRunning = false
		console.error('Exited with code:', code)
		if (code === 0) return
		watchFile(args[0], () => {
			unwatchFile(args[0])
			start(file)
		})
	})
}
start('firemd.js')