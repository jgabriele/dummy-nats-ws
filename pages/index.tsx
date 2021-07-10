import React from 'react'
import {
  TextField,
  Typography,
  Grid,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@material-ui/core'
import { connect, jwtAuthenticator, NatsConnection } from 'nats.ws'
import Head from 'next/head'
import { createUser } from 'nkeys.js'
import * as ngsApi from 'ngsapi-js'

type Message = {
  subject: string
  content: string
  date: string
}

type Props = {
  nats: NatsConnection | null
}

function SubscribeSection({ nats }: Props) {
  const [value, setValue] = React.useState('')
  const [subjects, setSubjects] = React.useState<string[]>([])
  const [messages, setMessages] = React.useState<Message[]>([])

  const onMessageReceived = React.useCallback(
    (subject: string, err: any, message: string) => {
      if (err) {
        console.error(err)
        return
      }

      setMessages(
        messages.concat({
          subject,
          content: message,
          date: new Date().toISOString(),
        })
      )
    },
    [messages]
  )

  React.useEffect(() => {
    const subscriptions = subjects.map((subject) =>
      nats?.subscribe(subject, {
        callback: (err, message) => {
          onMessageReceived(
            subject,
            err,
            new TextDecoder().decode(message.data)
          )
          return 'OK'
        },
      })
    )
    return () => {
      subscriptions.forEach((sub) => sub?.unsubscribe())
    }
  }, [nats, onMessageReceived, subjects])

  function addSubject() {
    setSubjects(subjects.concat(value))
    setValue('')
  }

  if (!nats) {
    return null
  }

  return (
    <>
      <Grid container justifyContent="space-between">
        <Grid item>
          <Typography variant="h3" paragraph>
            Subscribe
          </Typography>
        </Grid>
        <Grid item>
          <TextField
            variant="outlined"
            color="primary"
            size="small"
            label="Subject"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            variant="outlined"
            color="primary"
            onClick={addSubject}
            disabled={subjects.some((sub) => sub === value)}
          >
            Add Subject
          </Button>
        </Grid>
      </Grid>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Subject</TableCell>
              <TableCell>Messages</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject}>
                <TableCell>{subject}</TableCell>
                <TableCell>
                  {messages
                    .filter((msg) => msg.subject === subject)
                    .map((msg) => (
                      <div key={msg.date}>
                        [{msg.date}] {msg.content}
                      </div>
                    ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

function PublishSection({ nats }: Props) {
  const [subject, setSubject] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')

  function publishMessage() {
    try {
      nats?.publish(subject, new TextEncoder().encode(message))
    } catch (e) {
      if (e.message === 'CONNECTION_CLOSED') {
        setError('Connection closed, please refresh the page')
      }
    }
  }

  return (
    <>
      <Typography variant="h3" paragraph>
        Publish
      </Typography>
      {error && (
        <Typography color="error" paragraph>
          {error}
        </Typography>
      )}
      <TextField
        variant="outlined"
        color="primary"
        size="small"
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <TextField
        variant="outlined"
        color="primary"
        size="small"
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        variant="outlined"
        color="primary"
        onClick={publishMessage}
        disabled={!subject || !message}
      >
        Publish message
      </Button>
    </>
  )
}

export default function Home() {
  const [accountSeed, setAccountSeed] = React.useState('')
  const [natsConnection, setNatsConnection] =
    React.useState<NatsConnection | null>(null)

  async function onClick() {
    const ukp = createUser()
    const jwt = await ngsApi.encodeUser(
      `${Math.round(Math.random() * 100000)}`,
      ukp,
      accountSeed,
      {
        pub: {
          allow: ['*'],
          deny: [],
        },
        sub: {
          allow: ['*'],
          deny: [],
        },
        bearer_token: true,
      }
    )
    const nc = await connect({
      servers: ['wss://eu.geo.ngs.synadia-test.com'],
      name: 'nats-ws',
      debug: true,
      authenticator: jwtAuthenticator(jwt),
    })
    setNatsConnection(nc)
  }

  return (
    <div>
      <Head>
        <title>Chat with Nats</title>
        <meta name="description" content="Chat app using NATS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        Test
        <TextField
          variant="outlined"
          color="primary"
          size="small"
          label="Account"
          value={accountSeed}
          onChange={(e) => setAccountSeed(e.target.value)}
        />
        <Button variant="outlined" color="primary" onClick={onClick}>
          Connect with new user
        </Button>
        <SubscribeSection nats={natsConnection} />
        <PublishSection nats={natsConnection} />
      </main>
    </div>
  )
}
