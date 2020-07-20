import { document } from 'global';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import styled from '@emotion/styled';

import Events from './constants';
import Swatch from './Swatch';

const Wrapper = styled.div({
  padding: 20,
});

const Title = styled.h5({
  fontSize: 16,
});

const Pre = styled.pre(({ theme }) => ({
  padding: '30px',
  display: 'block',
  background: theme.fillColor,
  marginTop: '15px',
  lineHeight: '1.75em',
}));

const List = styled.div({
  display: 'inline-block',
  padding: 15,
});
const Item = styled.div({
  display: 'inline-block',
  padding: 5,
});

const storybookIframe = 'storybook-preview-iframe';

const defaultTheme = {
  attribute: '',
  color: 'transparent',
  default: true,
  name: 'default',
};

const instructionsHtml = `
import { storiesOf } from '@storybook/react';
import { withThemes } from 'storybook-addon-themes';

storiesOf('Button', module)
  .addDecorator(
    withThemes([
      { name: "twitter", attribute: "theme-twt", color: "#00aced", default: true },
      { name: "facebook", attribute: "theme-fb", color: "#3b5998" },
    ])
  )
  .add('with text', () => <button>Click me</button>);
`.trim();

const Instructions = () => (
  <Wrapper>
    <Title>Setup Instructions</Title>
    <p>
      Please add the theme decorator definition to your story. The theme decorate accepts
      an array of items, which should include a name for your color (preferably the css attribute name)
      , a corresponding color / image value and the css attribute that will be added.
    </p>
    <p>Below is an example of how to add the theme decorator to your story definition.</p>
    <Pre>
      <code>{instructionsHtml}</code>
    </Pre>
  </Wrapper>
);

export default class ThemePanel extends Component {
  constructor(props) {
    super(props);

    this.state = { themes: [] };
  }

  componentDidMount() {
    const { api, channel } = this.props;
    this.iframe = document.getElementById(storybookIframe);

    if (!this.iframe) {
      throw new Error('Cannot find Storybook iframe');
    }

    channel.on(Events.SET, data => {
      const themes = [...data];

      this.setState({ themes });
      const current = api.getQueryParam('theme');
      const defaultOrFirst = themes.find(x => x.default) || themes[0];

      // debugger;

      const foundTheme =
        current && themes.find(theme => theme.name === decodeURI(current) || theme.attribute === current || theme.color === current);

      if (foundTheme) {
        this.updateIframe(foundTheme.attribute);
      } else if (defaultOrFirst) {
        this.updateIframe(defaultOrFirst.attribute);
        api.setQueryParams({ theme: defaultOrFirst.attribute });
      }
    });

    channel.on(Events.UNSET, () => {
      this.setState({ themes: [] });
      this.updateIframe();
    });
  }

  setThemeFromSwatch = themeAttribute => {
    const { api } = this.props;
    this.updateIframe(themeAttribute);
    api.setQueryParams({ theme: themeAttribute });
  };

  updateIframe(themeAttribute) {
    const { themes = [] } = this.state;
    const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
    const { documentElement } = iframeDocument;
    console.log(documentElement);
    themes
      .filter(theme => theme.attribute)
      .forEach(theme => documentElement.removeAttribute(theme.attribute));

    if (themeAttribute) {
      documentElement.setAttribute(themeAttribute, '');
    }
  }

  render() {
    const { active } = this.props;
    const { themes = [] } = this.state;

    if (!active) {
      return null;
    }
    if (!themes.length) return <Instructions />;

    const hasDefault = themes.filter(x => x.default).length;
    if (!hasDefault) themes.push(defaultTheme);

    return (
      <List>
        {themes.map((props) => (
          <Item key={`${props.name} ${props.attribute}`}>
            <Swatch {...props} setTheme={this.setThemeFromSwatch} />
          </Item>
        ))}
      </List>
    );
  }
}
ThemePanel.propTypes = {
  active: PropTypes.bool.isRequired,
  api: PropTypes.shape({
    getQueryParam: PropTypes.func,
    setQueryParams: PropTypes.func,
  }).isRequired,
  channel: PropTypes.shape({
    emit: PropTypes.func,
    on: PropTypes.func,
    removeListener: PropTypes.func,
  }),
};
ThemePanel.defaultProps = {
  channel: undefined,
};
